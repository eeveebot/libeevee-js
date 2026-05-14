'use strict';

import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';
import { ModuleMetrics, createModuleMetrics } from './create-module-metrics.mjs';

export interface BroadcastUnregistrationOptions {
  broadcastUUID: string;
}

/**
 * Unregister a broadcast from the router.
 *
 * Publishes an unregistration message to `broadcast.unregister`.
 * Should be called during graceful shutdown or when dynamically removing a broadcast.
 *
 * @param nats - Connected NATS client
 * @param options - Broadcast unregistration options
 * @param metrics - Optional ModuleMetrics instance
 */
export async function unregisterBroadcast(
  nats: InstanceType<typeof NatsClient>,
  options: BroadcastUnregistrationOptions,
  metrics?: ModuleMetrics
): Promise<void> {
  const m = metrics ?? createModuleMetrics('unregister-broadcast');

  const unregistration = {
    type: 'broadcast.unregister',
    broadcastUUID: options.broadcastUUID,
  };

  try {
    await nats.publish('broadcast.unregister', JSON.stringify(unregistration));
    m.recordNatsPublish('broadcast_unregister');
    log.info(`Unregistered broadcast ${options.broadcastUUID} from router`, {
      producer: options.broadcastUUID,
    });
  } catch (error) {
    log.error(`Failed to unregister broadcast ${options.broadcastUUID}`, {
      producer: options.broadcastUUID,
      error,
    });
  }
}
