'use strict';

import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';
import { ModuleMetrics, createModuleMetrics } from './create-module-metrics.mjs';

/**
 * Unregister help information for a module.
 *
 * Publishes a removal message to `help.remove`.
 * Should be called during graceful shutdown.
 *
 * @param nats - Connected NATS client
 * @param moduleName - Module name (same as used in registerHelp)
 * @param metrics - Optional ModuleMetrics instance
 */
export async function unregisterHelp(
  nats: InstanceType<typeof NatsClient>,
  moduleName: string,
  metrics?: ModuleMetrics
): Promise<void> {
  const m = metrics ?? createModuleMetrics('unregister-help');

  const removal = {
    type: 'help.remove',
    from: moduleName,
  };

  try {
    await nats.publish('help.remove', JSON.stringify(removal));
    m.recordNatsPublish('help_remove');
    log.info(`Unregistered help for ${moduleName}`, {
      producer: moduleName,
    });
  } catch (error) {
    log.error(`Failed to unregister help for ${moduleName}`, {
      producer: moduleName,
      error,
    });
  }
}
