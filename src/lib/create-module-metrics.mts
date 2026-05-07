'use strict';

import {
  commandCounter,
  commandProcessingTime,
  commandErrorCounter,
  natsPublishCounter,
  natsSubscribeCounter,
} from './metrics.mjs';
import { log } from './log.mjs';

/**
 * Create a module-scoped metrics recorder with the common metric helpers.
 *
 * Instead of every module copy-pasting the same recordNatsPublish,
 * recordNatsSubscribe, recordXxxCommand, etc. functions with only the
 * module name changed, this factory provides them pre-bound.
 *
 * Usage:
 *   const metrics = createModuleMetrics('echo');
 *   metrics.recordNatsPublish('command.register', 'command_registration');
 *   metrics.recordCommand(data.platform, data.network, data.channel, 'success');
 *   metrics.recordError('parse_error');
 *   metrics.recordProcessingTime(0.025);
 *   metrics.recordNatsSubscribe(subject);
 */
export function createModuleMetrics(moduleName: string) {
  return {
    /**
     * Record a NATS publish operation.
     */
    recordNatsPublish(messageType: string): void {
      try {
        natsPublishCounter.inc({ module: moduleName, type: messageType });
      } catch (error) {
        log.error('Failed to record NATS publish metric', {
          producer: `${moduleName}-metrics`,
          error,
        });
      }
    },

    /**
     * Record a NATS subscribe operation.
     */
    recordNatsSubscribe(subject: string): void {
      try {
        natsSubscribeCounter.inc({ module: moduleName, subject });
      } catch (error) {
        log.error('Failed to record NATS subscribe metric', {
          producer: `${moduleName}-metrics`,
          error,
        });
      }
    },

    /**
     * Record a command execution.
     */
    recordCommand(
      platform: string,
      network: string,
      channel: string,
      result: string
    ): void {
      try {
        commandCounter.inc({
          module: moduleName,
          platform,
          network,
          channel,
          result,
        });
      } catch (error) {
        log.error('Failed to record command metric', {
          producer: `${moduleName}-metrics`,
          error,
        });
      }
    },

    /**
     * Record a command error.
     */
    recordError(errorType: string): void {
      try {
        commandErrorCounter.inc({ module: moduleName, type: errorType });
      } catch (error) {
        log.error('Failed to record command error metric', {
          producer: `${moduleName}-metrics`,
          error,
        });
      }
    },

    /**
     * Record command processing time in seconds.
     */
    recordProcessingTime(durationSeconds: number): void {
      try {
        commandProcessingTime.observe({ module: moduleName }, durationSeconds);
      } catch (error) {
        log.error('Failed to record processing time metric', {
          producer: `${moduleName}-metrics`,
          error,
        });
      }
    },
  };
}

export type ModuleMetrics = ReturnType<typeof createModuleMetrics>;
