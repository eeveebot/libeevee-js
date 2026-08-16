'use strict';

import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';
import { ModuleMetrics, createModuleMetrics } from './create-module-metrics.mjs';

export interface EventUnregistrationOptions {
  eventUUID: string;
}

/**
 * Unregister an event subscription from the router.
 *
 * Publishes an unregistration message to `event.unregister`.
 * Should be called during graceful shutdown or when dynamically removing an event subscription.
 *
 * @param nats - Connected NATS client
 * @param options - Event unregistration options
 * @param metrics - Optional ModuleMetrics instance
 */
export async function unregisterEvent(
  nats: InstanceType<typeof NatsClient>,
  options: EventUnregistrationOptions,
  metrics?: ModuleMetrics
): Promise<void> {
  const m = metrics ?? createModuleMetrics('unregister-event');

  const unregistration = {
    type: 'event.unregister',
    eventUUID: options.eventUUID,
  };

  try {
    await nats.publish('event.unregister', JSON.stringify(unregistration));
    m.recordNatsPublish('event_unregister');
    log.info(`Unregistered event ${options.eventUUID} from router`, {
      producer: options.eventUUID,
    });
  } catch (error) {
    log.error(`Failed to unregister event ${options.eventUUID}`, {
      producer: options.eventUUID,
      error,
    });
  }
}
