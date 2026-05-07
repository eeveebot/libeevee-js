'use strict';

/**
 * Rate limit configuration for command registration.
 * Shared across all modules that register commands.
 */
export interface RateLimitConfig {
  mode: 'enqueue' | 'drop';
  level: 'channel' | 'user' | 'global';
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
