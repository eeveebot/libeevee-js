'use strict';

import * as Nats from 'nats';
import { log } from './log.mjs';
import { NatsClient } from './nats-client.mjs';
import { register as promRegister } from './metrics.mjs';
import { ModuleMetrics } from './create-module-metrics.mjs';

/** NatsClient subscription return type */
type NatsSubscription = Promise<Nats.Subscription | false>;

/**
 * Options for registerStatsHandlers.
 */
export interface StatsHandlersOptions {
  /** The NATS client instance */
  nats: InstanceType<typeof NatsClient>;
  /** Module name (used in logging and response payloads) */
  moduleName: string;
  /** Module start time (Date.now() captured at startup) */
  startTime: number;
  /** Optional: Prometheus register instance (defaults to libeevee's shared register) */
  prometheusRegister?: typeof promRegister;
  /** Optional: module metrics instance for recording NATS pub/sub */
  metrics?: ModuleMetrics;
}

/** Minimal message interface for NATS callbacks */
interface NatsMessage {
  string(): string;
}

/**
 * Format milliseconds into a human-readable uptime string.
 * e.g. "1d 2h 3m 4s"
 */
export function formatUptime(ms: number): string {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Subscribe to `stats.uptime` and `stats.emit.request` on NATS and respond
 * with module uptime and full stats respectively.
 *
 * Returns an array of subscription objects (for the caller to track or push
 * onto natsSubscriptions).
 */
export function registerStatsHandlers(options: StatsHandlersOptions): NatsSubscription[] {
  const { nats, moduleName, startTime, metrics } = options;
  const promReg = options.prometheusRegister ?? promRegister;
  const subscriptions: NatsSubscription[] = [];

  // --- stats.uptime ---
  const uptimeSub = nats.subscribe('stats.uptime', (subject: string, message: NatsMessage) => {
    metrics?.recordNatsSubscribe(subject);
    try {
      const data = JSON.parse(message.string());
      log.info('Received stats.uptime request', {
        producer: moduleName,
        replyChannel: data.replyChannel,
      });

      const uptime = Date.now() - startTime;
      const uptimeResponse = {
        module: moduleName,
        uptime,
        uptimeFormatted: formatUptime(uptime),
      };

      if (data.replyChannel) {
        void nats.publish(data.replyChannel, JSON.stringify(uptimeResponse));
        metrics?.recordNatsPublish('uptime_response');
      }
    } catch (error) {
      log.error('Failed to process stats.uptime request', {
        producer: moduleName,
        error,
      });
    }
  });
  subscriptions.push(uptimeSub);

  // --- stats.emit.request ---
  const statsSub = nats.subscribe('stats.emit.request', (subject: string, message: NatsMessage) => {
    metrics?.recordNatsSubscribe(subject);
    try {
      const data = JSON.parse(message.string());
      log.info('Received stats.emit.request', {
        producer: moduleName,
        replyChannel: data.replyChannel,
      });

      const uptime = Date.now() - startTime;

      void promReg
        .metrics()
        .then((prometheusMetrics: string) => {
          const memoryUsage = process.memoryUsage();

          const statsResponse = {
            module: moduleName,
            stats: {
              uptime_seconds: Math.floor(uptime / 1000),
              uptime_formatted: formatUptime(uptime),
              memory_rss_mb: Math.round(memoryUsage.rss / (1024 * 1024)),
              memory_heap_used_mb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
              prometheus_metrics: prometheusMetrics,
            },
          };

          if (data.replyChannel) {
            void nats.publish(data.replyChannel, JSON.stringify(statsResponse));
            metrics?.recordNatsPublish('stats_response');
          }
        })
        .catch((error: unknown) => {
          log.error('Failed to collect prometheus metrics', {
            producer: moduleName,
            error,
          });
        });
    } catch (error) {
      log.error('Failed to process stats.emit.request', {
        producer: moduleName,
        error,
      });
    }
  });
  subscriptions.push(statsSub);

  return subscriptions;
}
