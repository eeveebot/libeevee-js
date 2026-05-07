'use strict';

import { NatsClient } from './nats-client.mjs';
import { log } from './log.mjs';
import { RateLimitConfig } from './types.mjs';
import { ModuleMetrics, createModuleMetrics } from './create-module-metrics.mjs';

export interface CommandRegistrationOptions {
  commandUUID: string;
  commandDisplayName: string;
  regex: string;
  platformPrefixAllowed?: boolean;
  ratelimit?: RateLimitConfig;
  /** Defaults to '.*' for all platform/network/instance/channel/user matchers */
  platform?: string;
  network?: string;
  instance?: string;
  channel?: string;
  user?: string;
}

/**
 * Register a command with the router and optionally subscribe to
 * control.registerCommands subjects for automatic re-registration.
 *
 * @param nats - Connected NATS client
 * @param options - Command registration options
 * @param metrics - Optional ModuleMetrics instance (from createModuleMetrics)
 *   If provided, records NATS publish/subscribe metrics automatically.
 *   If omitted, creates a transient one named after the commandDisplayName.
 * @param autoControlSub - If true (default), subscribes to
 *   `control.registerCommands` and `control.registerCommands.<displayName>`
 *   to automatically re-register the command when requested.
 * @returns Array of subscription promises (empty if autoControlSub is false)
 */
export async function registerCommand(
  nats: InstanceType<typeof NatsClient>,
  options: CommandRegistrationOptions,
  metrics?: ModuleMetrics,
  autoControlSub: boolean = true
): Promise<Array<Promise<string | boolean>>> {
  const m = metrics ?? createModuleMetrics(options.commandDisplayName);
  const subscriptions: Array<Promise<string | boolean>> = [];

  const registration = {
    type: 'command.register',
    commandUUID: options.commandUUID,
    commandDisplayName: options.commandDisplayName,
    platform: options.platform ?? '.*',
    network: options.network ?? '.*',
    instance: options.instance ?? '.*',
    channel: options.channel ?? '.*',
    user: options.user ?? '.*',
    regex: options.regex,
    platformPrefixAllowed: options.platformPrefixAllowed ?? true,
    ratelimit: options.ratelimit,
  };

  try {
    await nats.publish('command.register', JSON.stringify(registration));
    m.recordNatsPublish('command_registration');
    log.info(`Registered ${options.commandDisplayName} command with router`, {
      producer: options.commandDisplayName,
    });
  } catch (error) {
    log.error(`Failed to register ${options.commandDisplayName} command`, {
      producer: options.commandDisplayName,
      error,
    });
  }

  if (autoControlSub) {
    // Re-register on control.registerCommands.<displayName>
    const specificSub = nats.subscribe(
      `control.registerCommands.${options.commandDisplayName}`,
      (subject) => {
        m.recordNatsSubscribe(subject);
        log.info(
          `Received control.registerCommands.${options.commandDisplayName} control message`,
          { producer: options.commandDisplayName }
        );
        void registerCommand(nats, options, m, false);
      }
    );
    subscriptions.push(specificSub);

    // Re-register on control.registerCommands (all commands)
    const allSub = nats.subscribe('control.registerCommands', (subject) => {
      m.recordNatsSubscribe(subject);
      log.info('Received control.registerCommands control message', {
        producer: options.commandDisplayName,
      });
      void registerCommand(nats, options, m, false);
    });
    subscriptions.push(allSub);
  }

  return subscriptions;
}
