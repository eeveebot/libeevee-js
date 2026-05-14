'use strict';

import type * as Nats from 'nats';

/**
 * Result of a NATS subscribe() call.
 * Returns the Subscription on success, or false if the client is not initialized.
 */
export type NatsSubscriptionResult = Nats.Subscription | false;

/**
 * Rate limit configuration for command registration.
 * Shared across all modules that register commands.
 */
export interface RateLimitConfig {
  mode: 'enqueue' | 'drop';
  level: 'platform' | 'instance' | 'channel' | 'user' | 'global';
  limit: number;
  interval: string; // e.g., "30s", "1m", "5m"
}

/**
 * Default rate limit configuration used when no module-specific config is provided.
 */
export const defaultRateLimit: RateLimitConfig = {
  mode: 'drop',
  level: 'user',
  limit: 5,
  interval: '1m',
};
