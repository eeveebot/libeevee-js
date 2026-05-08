'use strict';

import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';
import { ModuleMetrics, createModuleMetrics } from './create-module-metrics.mjs';

export interface BroadcastRegistrationOptions {
  broadcastUUID: string;
  /** Required — needed for control.registerBroadcasts.<name> subscription */
  broadcastDisplayName: string;
  /** Defaults to '.*' for all platform/network/instance/channel/user/nick matchers */
  platform?: string;
  network?: string;
  instance?: string;
  channel?: string;
  user?: string;
  nick?: string;
  messageFilterRegex?: string;
}

/**
 * Register a broadcast with the router and optionally subscribe to
 * control.registerBroadcasts subjects for automatic re-registration.
 *
 * @param nats - Connected NATS client
 * @param options - Broadcast registration options
 * @param metrics - Optional ModuleMetrics instance (from createModuleMetrics)
 *   If provided, records NATS publish/subscribe metrics automatically.
 *   If omitted, creates a transient one named after the broadcastDisplayName.
 * @param autoControlSub - If true (default), subscribes to
 *   `control.registerBroadcasts` and `control.registerBroadcasts.<displayName>`
 *   to automatically re-register the broadcast when requested.
 * @returns Array of subscription promises (empty if autoControlSub is false)
 */
export async function registerBroadcast(
  nats: InstanceType<typeof NatsClient>,
  options: BroadcastRegistrationOptions,
  metrics?: ModuleMetrics,
  autoControlSub: boolean = true
): Promise<Array<Promise<string | boolean>>> {
  const m = metrics ?? createModuleMetrics(options.broadcastDisplayName);
  const subscriptions: Array<Promise<string | boolean>> = [];

  const registration = {
    type: 'broadcast.register',
    broadcastUUID: options.broadcastUUID,
    broadcastDisplayName: options.broadcastDisplayName,
    platform: options.platform ?? '.*',
    network: options.network ?? '.*',
    instance: options.instance ?? '.*',
    channel: options.channel ?? '.*',
    user: options.user ?? '.*',
    nick: options.nick ?? '.*',
    messageFilterRegex: options.messageFilterRegex ?? '.*',
  };

  try {
    await nats.publish('broadcast.register', JSON.stringify(registration));
    m.recordNatsPublish('broadcast_register');
    log.info(`Registered ${options.broadcastDisplayName} broadcast with router`, {
      producer: options.broadcastDisplayName,
    });
  } catch (error) {
    log.error(`Failed to register ${options.broadcastDisplayName} broadcast`, {
      producer: options.broadcastDisplayName,
      error,
    });
  }

  if (autoControlSub) {
    // Re-register on control.registerBroadcasts.<displayName>
    const specificSub = nats.subscribe(
      `control.registerBroadcasts.${options.broadcastDisplayName}`,
      (subject) => {
        m.recordNatsSubscribe(subject);
        log.info(
          `Received control.registerBroadcasts.${options.broadcastDisplayName} control message`,
          { producer: options.broadcastDisplayName }
        );
        void registerBroadcast(nats, options, m, false);
      }
    );
    subscriptions.push(specificSub);

    // Re-register on control.registerBroadcasts (all broadcasts)
    const allSub = nats.subscribe('control.registerBroadcasts', (subject) => {
      m.recordNatsSubscribe(subject);
      log.info('Received control.registerBroadcasts control message', {
        producer: options.broadcastDisplayName,
      });
      void registerBroadcast(nats, options, m, false);
    });
    subscriptions.push(allSub);
  }

  return subscriptions;
}
