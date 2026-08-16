'use strict';

import * as Nats from 'nats';
import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';
import { ModuleMetrics, createModuleMetrics } from './create-module-metrics.mjs';

export interface EventRegistrationOptions {
  eventUUID: string;
  /** Required — needed for control.registerEvents.<name> subscription */
  eventDisplayName: string;
  /** Regex pattern for event types to match (e.g. 'part|quit|kick', or '.*' for all) */
  eventType: string;
  /** Defaults to '.*' for all platform/network/instance/channel/user/nick matchers */
  platform?: string;
  network?: string;
  instance?: string;
  channel?: string;
  user?: string;
  nick?: string;
}

/**
 * Register an event subscription with the router and optionally subscribe to
 * control.registerEvents subjects for automatic re-registration.
 *
 * @param nats - Connected NATS client
 * @param options - Event registration options
 * @param metrics - Optional ModuleMetrics instance (from createModuleMetrics)
 *   If provided, records NATS publish/subscribe metrics automatically.
 *   If omitted, creates a transient one named after the eventDisplayName.
 * @param autoControlSub - If true (default), subscribes to
 *   `control.registerEvents` and `control.registerEvents.<displayName>`
 *   to automatically re-register the event when requested.
 * @returns Array of subscription promises (empty if autoControlSub is false)
 */
export async function registerEvent(
  nats: InstanceType<typeof NatsClient>,
  options: EventRegistrationOptions,
  metrics?: ModuleMetrics,
  autoControlSub: boolean = true
): Promise<Array<Promise<Nats.Subscription | false>>> {
  const m = metrics ?? createModuleMetrics(options.eventDisplayName);
  const subscriptions: Array<Promise<Nats.Subscription | false>> = [];

  const registration = {
    type: 'event.register',
    eventUUID: options.eventUUID,
    eventDisplayName: options.eventDisplayName,
    eventType: options.eventType,
    platform: options.platform ?? '.*',
    network: options.network ?? '.*',
    instance: options.instance ?? '.*',
    channel: options.channel ?? '.*',
    user: options.user ?? '.*',
    nick: options.nick ?? '.*',
  };

  try {
    await nats.publish('event.register', JSON.stringify(registration));
    m.recordNatsPublish('event_register');
    log.info(`Registered ${options.eventDisplayName} event with router`, {
      producer: options.eventDisplayName,
    });
  } catch (error) {
    log.error(`Failed to register ${options.eventDisplayName} event`, {
      producer: options.eventDisplayName,
      error,
    });
  }

  if (autoControlSub) {
    // Re-register on control.registerEvents.<displayName>
    const specificSub = nats.subscribe(
      `control.registerEvents.${options.eventDisplayName}`,
      (subject) => {
        m.recordNatsSubscribe(subject);
        log.info(
          `Received control.registerEvents.${options.eventDisplayName} control message`,
          { producer: options.eventDisplayName }
        );
        void registerEvent(nats, options, m, false);
      }
    );
    subscriptions.push(specificSub);

    // Re-register on control.registerEvents (all events)
    const allSub = nats.subscribe('control.registerEvents', (subject) => {
      m.recordNatsSubscribe(subject);
      log.info('Received control.registerEvents control message', {
        producer: options.eventDisplayName,
      });
      void registerEvent(nats, options, m, false);
    });
    subscriptions.push(allSub);
  }

  return subscriptions;
}
