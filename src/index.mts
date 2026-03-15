'use strict';

import { eeveeLogo as _eeveeLogo, log as _log } from "./lib/log.mjs";
import { NatsClient as _NatsClient } from "./lib/nats-client.mjs";
import { handleSIG as _handleSIG } from "./lib/signal-handlers.mjs";
import {
  Counter as _Counter,
  Gauge as _Gauge,
  Histogram as _Histogram,
  uptimeGauge as _uptimeGauge,
  memoryUsageGauge as _memoryUsageGauge,
  natsPublishCounter as _natsPublishCounter,
  natsSubscribeCounter as _natsSubscribeCounter,
  errorCounter as _errorCounter,
  httpRequestCounter as _httpRequestCounter,
  httpRequestDuration as _httpRequestDuration,
  register as _register,
  initializeSystemMetrics as _initializeSystemMetrics
} from "./lib/metrics.mjs";
import { setupHttpServer as _setupHttpServer } from "./lib/http-server.mjs";

export const eeveeLogo = _eeveeLogo;
export const log = _log;

export const NatsClient = _NatsClient;

export const handleSIG = _handleSIG;

// Metrics exports
export const Counter = _Counter;
export const Gauge = _Gauge;
export const Histogram = _Histogram;
export const uptimeGauge = _uptimeGauge;
export const memoryUsageGauge = _memoryUsageGauge;
export const natsPublishCounter = _natsPublishCounter;
export const natsSubscribeCounter = _natsSubscribeCounter;
export const errorCounter = _errorCounter;
export const httpRequestCounter = _httpRequestCounter;
export const httpRequestDuration = _httpRequestDuration;
export const register = _register;
export const initializeSystemMetrics = _initializeSystemMetrics;

// HTTP server exports
export const setupHttpServer = _setupHttpServer;