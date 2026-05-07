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

    natsClients.forEach((natsClient) => {
      void natsClient.drain();
    });

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
