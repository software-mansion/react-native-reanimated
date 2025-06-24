'use strict';
import type { LoggerConfig } from 'react-native-worklets';
import { updateLoggerConfig } from 'react-native-worklets';

import { SHOULD_BE_USE_WEB } from './common';
import { executeOnUIRuntimeSync } from './core';

/** @deprecated This function is a no-op in Reanimated 4. */
export function addWhitelistedNativeProps(): void {
  // Do nothing. This is just for backward compatibility.
}

/** @deprecated This function is a no-op in Reanimated 4. */
export function addWhitelistedUIProps(): void {
  // Do nothing. This is just for backward compatibility.
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
