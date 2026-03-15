'use strict';

import { Counter, Gauge, Histogram, register } from 'prom-client';

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

// Initialize system metrics
export function initializeSystemMetrics(moduleName: string): void {
  // Update uptime gauge periodically
  setInterval(() => {
    uptimeGauge.set({ module: moduleName }, process.uptime());
  }, 10000); // Update every 10 seconds

  // Update memory usage periodically
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    memoryUsageGauge.set({ module: moduleName, type: 'heap_used' }, memoryUsage.heapUsed);
    memoryUsageGauge.set({ module: moduleName, type: 'heap_total' }, memoryUsage.heapTotal);
    memoryUsageGauge.set({ module: moduleName, type: 'rss' }, memoryUsage.rss);
    memoryUsageGauge.set({ module: moduleName, type: 'external' }, memoryUsage.external);
  }, 10000); // Update every 10 seconds
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