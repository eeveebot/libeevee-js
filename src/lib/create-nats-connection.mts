'use strict';

import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';

/**
 * Create and connect a NATS client using environment variables.
 *
 * Reads NATS_HOST and NATS_TOKEN from the environment, validates them,
 * creates a NatsClient, and connects. Throws with a clear message if
 * either variable is missing.
 *
 * @param options - Optional overrides for env var names
 * @returns Connected NatsClient instance
 */
export async function createNatsConnection(options?: {
  hostEnvVar?: string;
  tokenEnvVar?: string;
}): Promise<InstanceType<typeof NatsClient>> {
  const hostKey = options?.hostEnvVar ?? 'NATS_HOST';
  const tokenKey = options?.tokenEnvVar ?? 'NATS_TOKEN';

  const natsHost = process.env[hostKey];
  if (!natsHost) {
    throw new Error(`environment variable ${hostKey} is not set.`);
  }

  const natsToken = process.env[tokenKey];
  if (!natsToken) {
    throw new Error(`environment variable ${tokenKey} is not set.`);
  }

  const nats = new NatsClient({
    natsHost,
    natsToken,
  });

  await nats.connect();

  return nats;
}
