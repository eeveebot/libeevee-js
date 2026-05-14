'use strict';

import * as Nats from 'nats';
import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';
import { ModuleMetrics } from './create-module-metrics.mjs';

export interface HelpEntry {
  command: string;
  descr: string;
  params: Array<{
    param: string;
    required: boolean;
    descr: string;
  }>;
  aliases?: string[];
}

/**
 * Register help information for a module.
 *
 * Publishes help data to `help.update` immediately, then subscribes to
 * `help.updateRequest` and `help.updateRequest.<moduleName>` to
 * re-publish when requested.
 *
 * @param nats - Connected NATS client
 * @param moduleName - Module name (used as `from` in the help update)
 * @param helpData - Array of help entries
 * @param metrics - Optional ModuleMetrics for recording publish/subscribe
 * @returns Array of subscription promises
 */
export async function registerHelp(
  nats: InstanceType<typeof NatsClient>,
  moduleName: string,
  helpData: HelpEntry[],
  metrics?: ModuleMetrics
): Promise<Array<Promise<Nats.Subscription | false>>> {
  const subscriptions: Array<Promise<Nats.Subscription | false>> = [];

  async function publishHelp(): Promise<void> {
    const helpUpdate = {
      from: moduleName,
      help: helpData,
    };

    try {
      await nats.publish('help.update', JSON.stringify(helpUpdate));
      if (metrics) metrics.recordNatsPublish('help_update');
      log.info(`Published ${moduleName} help information`, {
        producer: moduleName,
      });
    } catch (error) {
      log.error(`Failed to publish ${moduleName} help information`, {
        producer: moduleName,
        error,
      });
    }
  }

  // Publish immediately
  await publishHelp();

  // Subscribe to general help update requests
  const generalSub = nats.subscribe('help.updateRequest', (subject) => {
    if (metrics) metrics.recordNatsSubscribe(subject);
    log.info('Received help.updateRequest message', {
      producer: moduleName,
    });
    void publishHelp();
  });
  subscriptions.push(generalSub);

  // Subscribe to module-specific help update requests
  const specificSub = nats.subscribe(
    `help.updateRequest.${moduleName}`,
    (subject) => {
      if (metrics) metrics.recordNatsSubscribe(subject);
      log.info(`Received help.updateRequest.${moduleName} message`, {
        producer: moduleName,
      });
      void publishHelp();
    }
  );
  subscriptions.push(specificSub);

  return subscriptions;
}
