'use strict';

import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';
import { ModuleMetrics, createModuleMetrics } from './create-module-metrics.mjs';

export interface CommandUnregistrationOptions {
  commandUUID: string;
}

/**
 * Unregister a command from the router.
 *
 * Publishes an unregistration message to `command.unregister`.
 * Should be called during graceful shutdown or when dynamically removing a command.
 *
 * @param nats - Connected NATS client
 * @param options - Command unregistration options
 * @param metrics - Optional ModuleMetrics instance
 */
export async function unregisterCommand(
  nats: InstanceType<typeof NatsClient>,
  options: CommandUnregistrationOptions,
  metrics?: ModuleMetrics
): Promise<void> {
  const m = metrics ?? createModuleMetrics('unregister-command');

  const unregistration = {
    type: 'command.unregister',
    commandUUID: options.commandUUID,
  };

  try {
    await nats.publish('command.unregister', JSON.stringify(unregistration));
    m.recordNatsPublish('command_unregister');
    log.info(`Unregistered command ${options.commandUUID} from router`, {
      producer: options.commandUUID,
    });
  } catch (error) {
    log.error(`Failed to unregister command ${options.commandUUID}`, {
      producer: options.commandUUID,
      error,
    });
  }
}
