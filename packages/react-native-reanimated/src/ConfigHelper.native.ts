'use strict';

import { runOnUISync, scheduleOnRN } from 'react-native-worklets';

import type { LogData, LogFunction, LoggerConfig } from './common';
import { getLoggerConfig, updateLoggerConfig } from './common';

/**
 * Updates Reanimated logger config with the user-provided configuration. Will
 * affect Reanimated code executed after call to this function so it should be
 * called before any Reanimated code is executed to take effect. Each call to
 * this function will override the previous configuration (it's recommended to
 * call it only once).
 *
 * @param config - The new logger configuration to apply.
 * @param onLog - Optional callback invoked for every log, in addition to the
 *   default console output. Logs raised on the UI runtime are delivered
 *   asynchronously, on the React runtime.
 */
export function configureReanimatedLogger(
  config: LoggerConfig,
  onLog?: LogFunction
) {
  // Get the current config from the React runtime (to have a single source of truth)
  const currentConfig = getLoggerConfig();
  // Update the configuration object in the React runtime
  updateLoggerConfig(currentConfig, config, onLog);
  // The callback isn't a worklet, so the UI runtime can't call it directly.
  // Wrap it in one that schedules it back on the React runtime.
  const onLogOnUI = onLog
    ? (data: LogData) => {
        'worklet';
        scheduleOnRN(onLog, data);
      }
    : undefined;
  // Register the updated configuration in the UI runtime
  runOnUISync(updateLoggerConfig, currentConfig, config, onLogOnUI);
}
