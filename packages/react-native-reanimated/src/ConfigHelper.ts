'use strict';
import type { LoggerConfig } from 'react-native-worklets';

import { logger, SHOULD_BE_USE_WEB, updateLoggerConfig } from './common';
import { executeOnUIRuntimeSync } from './core';

export function addWhitelistedNativeProps(): void {
  logger.warn(
    '`addWhitelistedNativeProps` is no longer necessary in Reanimated 4 and will be removed in next version. Please remove this call from your code.'
  );
}

export function addWhitelistedUIProps(): void {
  logger.warn(
    '`addWhitelistedUIProps` is no longer necessary in Reanimated 4 and will be removed in next version. Please remove this call from your code.'
  );
}

/**
 * Updates Reanimated logger config with the user-provided configuration. Will
 * affect Reanimated code executed after call to this function so it should be
 * called before any Reanimated code is executed to take effect. Each call to
 * this function will override the previous configuration (it's recommended to
 * call it only once).
 *
 * @param config - The new logger configuration to apply.
 */
export function configureReanimatedLogger(config: LoggerConfig) {
  // Update the configuration object in the React runtime
  updateLoggerConfig(config);
  // Register the updated configuration in the UI runtime
  if (!SHOULD_BE_USE_WEB) {
    executeOnUIRuntimeSync(updateLoggerConfig)(config);
  }
}
