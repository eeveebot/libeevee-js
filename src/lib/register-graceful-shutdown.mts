'use strict';

import { NatsClient } from './nats-client.mjs';
import { handleSIG } from './signal-handlers.mjs';
import { log } from './log.mjs';

/**
 * Register graceful shutdown handlers for SIGINT/SIGTERM.
 *
 * Drains all provided NATS clients, then calls the optional cleanup
 * function, then delegates to handleSIG for the double-signal force-exit.
 *
 * @param natsClients - NATS clients to drain on shutdown
 * @param cleanup - Optional async cleanup function to run before handleSIG
 */
export function registerGracefulShutdown(
  natsClients: InstanceType<typeof NatsClient>[],
  cleanup?: () => Promise<void>
): void {
  const shutdown = async (signal: NodeJS.Signals) => {
    log.info(`Received ${signal}, draining NATS clients...`, {
      producer: 'registerGracefulShutdown',
    });

    await Promise.all(
      natsClients.map(async (natsClient) => {
        try {
          const drainPromise = natsClient.drain();
          const timeout = new Promise<void>((resolve) =>
            setTimeout(() => resolve(), 3000).unref()
          );
          await Promise.race([drainPromise, timeout]);
          log.info('NATS client drain completed or timed out', {
            producer: 'registerGracefulShutdown',
          });
        } catch (error) {
          log.error('NATS client drain failed', {
            producer: 'registerGracefulShutdown',
            error,
          });
        }
      })
    );

    if (cleanup) {
      try {
        await cleanup();
      } catch (error) {
        log.error('Cleanup function threw during shutdown', {
          producer: 'registerGracefulShutdown',
          error,
        });
      }
    }

    void handleSIG(signal);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
