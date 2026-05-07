'use strict';

import { log } from './log.mjs';

/**
 * A user object returned by queryChannelUsers.
 */
export interface ChannelUser {
  nick: string;
  ident: string;
  hostname: string;
  modes: string[];
}

// In-flight request tracker (module-level so closures can access it)
const pendingRequests = new Map<
  string,
  { resolve: (value: ChannelUser[]) => void; reject: (reason: unknown) => void; timeout: NodeJS.Timeout }
>();

/**
 * Query the IRC connector for the list of users in a channel via NATS RPC.
 *
 * Sends a `list-users-in-channel` control command to the connector and waits
 * for a reply on a unique reply channel (with a 5s timeout).
 *
 * @param nats   - NATS client instance
 * @param platform  - Platform name (e.g. "irc")
 * @param instance  - Instance name
 * @param channel   - Channel name
 * @param options   - Optional overrides
 * @param options.timeoutMs - RPC timeout in ms (default 5000)
 * @param options.metrics   - Module metrics for recording pub/sub
 * @param options.producer  - Name for log messages (default "queryChannelUsers")
 */
export function queryChannelUsers(
  nats: any, // NatsClient
  platform: string,
  instance: string,
  channel: string,
  options?: {
    timeoutMs?: number;
    metrics?: { recordNatsPublish: (type: string) => void; recordNatsSubscribe: (subject: string) => void };
    producer?: string;
  }
): Promise<ChannelUser[]> {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const metrics = options?.metrics;
  const producer = options?.producer ?? 'queryChannelUsers';

  // We need randomUUID — require inline to avoid top-level import issues
  const { randomUUID } = require('crypto') as { randomUUID: () => string };

  return new Promise<ChannelUser[]>((resolve, reject) => {
    const replyChannel = `${producer}.userlist.reply.${randomUUID()}`;

    const timeout = setTimeout(() => {
      pendingRequests.delete(replyChannel);
      reject(new Error('Timeout waiting for user list'));
    }, timeoutMs);

    pendingRequests.set(replyChannel, { resolve, reject, timeout });

    void nats
      .subscribe(replyChannel, (subject: string, message: any) => {
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

          resolve(response.users as ChannelUser[]);
        } catch (error) {
          log.error('Failed to process user list response', {
            producer,
            error: error instanceof Error ? error.message : String(error),
          });
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      })
      .catch((error: unknown) => {
        log.error('Failed to subscribe to user list reply channel', {
          producer,
          error: error instanceof Error ? error.message : String(error),
        });
        reject(error instanceof Error ? error : new Error(String(error)));
      });

    const controlMessage = {
      action: 'list-users-in-channel',
      data: {
        channel,
        replyChannel,
      },
    };

    const controlTopic = `control.chatConnectors.${platform}.${instance}`;
    void nats.publish(controlTopic, JSON.stringify(controlMessage));
    metrics?.recordNatsPublish('list_users_request');
  });
}
