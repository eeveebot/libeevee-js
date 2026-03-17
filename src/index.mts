'use strict';

// Type definitions
/// <reference path="./types/irc-colors.d.ts" />

import { eeveeLogo as _eeveeLogo, log as _log } from './lib/log.mjs';
import { NatsClient as _NatsClient } from './lib/nats-client.mjs';
import { handleSIG as _handleSIG } from './lib/signal-handlers.mjs';
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
  initializeSystemMetrics as _initializeSystemMetrics,
  messageCounter as _messageCounter,
  messageProcessingTime as _messageProcessingTime,
  connectionCounter as _connectionCounter,
  connectionGauge as _connectionGauge,
  channelCounter as _channelCounter,
  channelGauge as _channelGauge,
  commandCounter as _commandCounter,
  commandProcessingTime as _commandProcessingTime,
  commandErrorCounter as _commandErrorCounter,
  recordMessage as _recordMessage,
  recordConnection as _recordConnection,
  recordChannel as _recordChannel,
  recordCommand as _recordCommand,
  recordCommandError as _recordCommandError,
} from './lib/metrics.mjs';
import { setupHttpServer as _setupHttpServer } from './lib/http-server.mjs';

// Export irc-colors as a passthrough
export { default as ircColors } from 'irc-colors';

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
export const messageCounter = _messageCounter;
export const messageProcessingTime = _messageProcessingTime;
export const connectionCounter = _connectionCounter;
export const connectionGauge = _connectionGauge;
export const channelCounter = _channelCounter;
export const channelGauge = _channelGauge;
export const commandCounter = _commandCounter;
export const commandProcessingTime = _commandProcessingTime;
export const commandErrorCounter = _commandErrorCounter;
export const recordMessage = _recordMessage;
export const recordConnection = _recordConnection;
export const recordChannel = _recordChannel;
export const recordCommand = _recordCommand;
export const recordCommandError = _recordCommandError;

// HTTP server exports
export const setupHttpServer = _setupHttpServer;
