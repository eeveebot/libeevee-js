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
import { createNatsConnection as _createNatsConnection } from './lib/create-nats-connection.mjs';
import { registerGracefulShutdown as _registerGracefulShutdown } from './lib/register-graceful-shutdown.mjs';
import { createModuleMetrics as _createModuleMetrics } from './lib/create-module-metrics.mjs';
import { loadModuleConfig as _loadModuleConfig } from './lib/load-module-config.mjs';
export { RateLimitConfig, defaultRateLimit } from './lib/types.mjs';
export type { ModuleMetrics } from './lib/create-module-metrics.mjs';
export { registerCommand, CommandRegistrationOptions } from './lib/register-command.mjs';
export { sendChatMessage, sendAction, ChatMessage } from './lib/send-chat-message.mjs';
export { registerHelp, HelpEntry } from './lib/register-help.mjs';
export { registerStatsHandlers, StatsHandlersOptions } from './lib/register-stats-handlers.mjs';
export { queryChannelUsers, ChannelUser } from './lib/query-channel-users.mjs';
export { queryUserModes, UserModes } from './lib/query-user-modes.mjs';
export {
  colorizeForPlatform,
  colorizeBgForPlatform,
  styleForPlatform,
  colorizeByType,
  randomColorForPlatform,
  colorizeByValue,
  rainbowForPlatform,
  stripColors,
  stripStyle,
  stripColorsAndStyle,
  fgColors,
  bgColors,
  styles,
} from './lib/colorize.mjs';
export type {
  IrcColorName,
  IrcBgColorName,
  IrcStyleName,
  SemanticColorMap,
  ValueColorRange,
} from './lib/colorize.mjs';

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

// New helpers (Phase 1)
export const createNatsConnection = _createNatsConnection;
export const registerGracefulShutdown = _registerGracefulShutdown;
export const createModuleMetrics = _createModuleMetrics;
export const loadModuleConfig = _loadModuleConfig;
