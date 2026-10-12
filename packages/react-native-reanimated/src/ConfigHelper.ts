'use strict';

import type { LogFunction, LoggerConfig } from './common';
import { getLoggerConfig, updateLoggerConfig } from './common';

/**
 * Updates Reanimated logger config with the user-provided configuration. Will
 * affect Reanimated code executed after call to this function so it should be
 * called before any Reanimated code is executed to take effect. Each call to
 * this function will override the previous configuration (it's recommended to
 * call it only once).
 *
 * @param config - The new logger configuration to apply.
 * @param onLog - Optional callback invoked for every log that passes the
 *   `level` and `strict` filters, in addition to the default console output.
 *   Omitting it clears a previously registered callback.
 */
export function configureReanimatedLogger(
  config: LoggerConfig,
  onLog?: LogFunction
) {
  // Get the current config from the React runtime (to have a single source of truth)
  const currentConfig = getLoggerConfig();
  // Update the configuration object in the React runtime
  updateLoggerConfig(currentConfig, config, onLog);
}
