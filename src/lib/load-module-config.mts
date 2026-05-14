'use strict';

import fs from 'node:fs';
import yaml from 'js-yaml';
import { log } from './log.mjs';

/**
 * Load a module configuration from a YAML file.
 *
 * Reads the path from the MODULE_CONFIG_PATH environment variable.
 * Returns the provided defaults if the variable is unset or the file
 * cannot be read/parsed.
 *
 * Usage:
 *   interface EchoConfig { ratelimit?: RateLimitConfig }
 *   const config = loadModuleConfig<EchoConfig>({});
 */
export function loadModuleConfig<T>(
  defaults: T
): T {
  const configPath = process.env.MODULE_CONFIG_PATH;
  if (!configPath) {
    log.warn('MODULE_CONFIG_PATH not set, using default config', {
      producer: 'loadModuleConfig',
    });
    return defaults;
  }

  try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configFile, { schema: yaml.DEFAULT_SCHEMA });

    if (config === null || config === undefined || typeof config !== 'object' || Array.isArray(config)) {
      log.error('Module configuration is not a valid object, using defaults', {
        producer: 'loadModuleConfig',
        configPath,
        configType: typeof config,
      });
      return defaults;
    }

    log.info('Loaded module configuration', {
      producer: 'loadModuleConfig',
      configPath,
    });

    return config as T;
  } catch (error) {
    log.error('Failed to load module configuration, using defaults', {
      producer: 'loadModuleConfig',
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return defaults;
  }
}
