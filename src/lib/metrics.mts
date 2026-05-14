'use strict';

import { Counter, Gauge, Histogram, register } from 'prom-client';
import { log } from './log.mjs';

// Export prom-client classes for use in other modules
export { Counter, Gauge, Histogram };

// Core system metrics
export const uptimeGauge = new Gauge({
  name: 'uptime_seconds',
  help: 'Service uptime in seconds',
  labelNames: ['module'],
});

export const memoryUsageGauge = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Service memory usage in bytes',
  labelNames: ['module', 'type'],
});

// NATS communication metrics
export const natsPublishCounter = new Counter({
  name: 'nats_publish_total',
  help: 'Total number of NATS messages published',
  labelNames: ['module', 'type'],
});

export const natsSubscribeCounter = new Counter({
  name: 'nats_subscribe_total',
  help: 'Total number of NATS subscriptions',
  labelNames: ['module', 'subject'],
});

// Error metrics
export const errorCounter = new Counter({
  name: 'errors_total',
  help: 'Total number of errors encountered',
  labelNames: ['module', 'type', 'operation'],
});

// Generic message processing metrics
export const messageCounter = new Counter({
  name: 'messages_total',
  help: 'Total number of messages processed',
  labelNames: ['module', 'platform', 'direction', 'result'],
});

export const messageProcessingTime = new Histogram({
  name: 'message_processing_seconds',
  help: 'Time spent processing messages',
  labelNames: ['module'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Generic connection metrics
export const connectionCounter = new Counter({
  name: 'connections_total',
  help: 'Total number of connection attempts',
  labelNames: ['module', 'result'],
});

export const connectionGauge = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['module'],
});

// Generic channel metrics
export const channelCounter = new Counter({
  name: 'channels_total',
  help: 'Total number of channel join/part events',
  labelNames: ['module', 'action'],
});

export const channelGauge = new Gauge({
  name: 'active_channels',
  help: 'Number of active channels',
  labelNames: ['module', 'channel'],
});

// Generic command metrics
export const commandCounter = new Counter({
  name: 'commands_total',
  help: 'Total number of commands processed',
  labelNames: ['module', 'platform', 'network', 'channel', 'result'],
});

export const commandProcessingTime = new Histogram({
  name: 'command_processing_seconds',
  help: 'Time spent processing individual commands',
  labelNames: ['module'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Generic command error metrics
export const commandErrorCounter = new Counter({
  name: 'command_errors_total',
  help: 'Total number of command errors encountered',
  labelNames: ['module', 'type'],
});

// Helper functions for recording metrics safely
export function recordMessage(
  module: string,
  platform: string,
  network: string,
  channel: string,
  direction: string,
  result: string
): void {
  try {
    messageCounter.inc({
      module,
      platform,
      direction,
      result,
    });
  } catch (error) {
    log.error('Failed to record message metric', {
      producer: 'libeevee-metrics',
      error,
    });
  }
}

export function recordConnection(
  platform: string,
  network: string,
  result: string
): void {
  try {
    connectionCounter.inc({
      module: platform,
      result,
    });
  } catch (error) {
    log.error('Failed to record connection metric', {
      producer: 'libeevee-metrics',
      error,
    });
  }
}

export function recordChannel(
  platform: string,
  network: string,
  channel: string,
  action: string
): void {
  try {
    channelCounter.inc({
      module: platform,
      action,
    });
  } catch (error) {
    log.error('Failed to record channel metric', {
      producer: 'libeevee-metrics',
      error,
    });
  }
}

export function recordCommand(
  platform: string,
  network: string,
  channel: string,
  result: string
): void {
  try {
    commandCounter.inc({
      module: platform,
      platform: platform,
      network: network,
      channel: channel,
      result: result,
    });
  } catch (error) {
    log.error('Failed to record command metric', {
      producer: 'libeevee-metrics',
      error,
    });
  }
}

export function recordCommandError(platform: string, errorType: string): void {
  try {
    commandErrorCounter.inc({
      module: platform,
      type: errorType,
    });
  } catch (error) {
    log.error('Failed to record command error metric', {
      producer: 'libeevee-metrics',
      error,
    });
  }
}

// Initialize system metrics
export function initializeSystemMetrics(moduleName: string): void {
  // Update uptime gauge periodically
  setInterval(() => {
    uptimeGauge.set({ module: moduleName }, process.uptime());
  }, 10000).unref(); // Update every 10 seconds

  // Update memory usage periodically
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    memoryUsageGauge.set(
      { module: moduleName, type: 'heap_used' },
      memoryUsage.heapUsed
    );
    memoryUsageGauge.set(
      { module: moduleName, type: 'heap_total' },
      memoryUsage.heapTotal
    );
    memoryUsageGauge.set({ module: moduleName, type: 'rss' }, memoryUsage.rss);
    memoryUsageGauge.set(
      { module: moduleName, type: 'external' },
      memoryUsage.external
    );
  }, 10000).unref(); // Update every 10 seconds
}

// HTTP server metrics (for modules with HTTP servers)
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['module', 'method', 'route', 'status_code'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['module', 'method', 'route'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Export register for metrics collection
export { register };
