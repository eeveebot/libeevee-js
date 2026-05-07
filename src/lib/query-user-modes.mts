'use strict';

import { randomUUID } from 'node:crypto';
import { log } from './log.mjs';
import { NatsClient } from './nats-client.mjs';
import { ModuleMetrics } from './create-module-metrics.mjs';

/**
 * User modes returned by queryUserModes.
 */
export interface UserModes {
  channel: string;
  nick: string;
  modes: string[];
  isChannelAdmin: boolean;
}

/** Minimal message interface for NATS callbacks */
interface NatsMessage {
  string(): string;
}

// In-flight request tracker (module-level so closures can access it)
const pendingRequests = new Map<
  string,
  { resolve: (value: UserModes) => void; reject: (reason: unknown) => void; timeout: NodeJS.Timeout }
>();

/**
 * Query the IRC connector for a user's channel membership modes via NATS RPC.
 *
 * Sends a `get-modes-for-user` control command to the connector and waits
 * for a reply on a unique reply channel (with a 5s timeout).
 *
 * @param nats      - NATS client instance
 * @param platform  - Platform name (e.g. "irc")
 * @param instance  - Instance name
 * @param channel   - Channel name
 * @param nick      - Nickname to query modes for
 * @param options   - Optional overrides
 * @param options.timeoutMs - RPC timeout in ms (default 5000)
 * @param options.metrics   - Module metrics for recording pub/sub
 * @param options.producer  - Name for log messages (default "queryUserModes")
 */
export function queryUserModes(
  nats: InstanceType<typeof NatsClient>,
  platform: string,
  instance: string,
  channel: string,
  nick: string,
  options?: {
    timeoutMs?: number;
    metrics?: ModuleMetrics;
    producer?: string;
  }
): Promise<UserModes> {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const metrics = options?.metrics;
  const producer = options?.producer ?? 'queryUserModes';

  return new Promise<UserModes>((resolve, reject) => {
    const replyChannel = `${producer}.usermodes.reply.${randomUUID()}`;

    const timeout = setTimeout(() => {
      pendingRequests.delete(replyChannel);
      reject(new Error('Timeout waiting for user modes'));
    }, timeoutMs);

    pendingRequests.set(replyChannel, { resolve, reject, timeout });

    void nats
      .subscribe(replyChannel, (subject: string, message: NatsMessage) => {
        metrics?.recordNatsSubscribe(subject);
        try {
          const request = pendingRequests.get(replyChannel);
          if (request) {
            clearTimeout(request.timeout);
            pendingRequests.delete(replyChannel);
          }

          const response = JSON.parse(message.string());

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          resolve({
            channel: response.channel,
            nick: response.nick,
            modes: response.modes || [],
            isChannelAdmin: response.isChannelAdmin ?? false,
          });
        } catch (error) {
          log.error('Failed to process user modes response', {
            producer,
            error: error instanceof Error ? error.message : String(error),
          });
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      })
      .catch((error: unknown) => {
        log.error('Failed to subscribe to user modes reply channel', {
          producer,
          error: error instanceof Error ? error.message : String(error),
        });
        reject(error instanceof Error ? error : new Error(String(error)));
      });

    const controlMessage = {
      action: 'get-modes-for-user',
      data: {
        channel,
        nick,
        replyChannel,
      },
    };

    const controlTopic = `control.chatConnectors.${platform}.${instance}`;
    void nats.publish(controlTopic, JSON.stringify(controlMessage));
    metrics?.recordNatsPublish('get_modes_request');
  });
}
