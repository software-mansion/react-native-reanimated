'use strict';
import type { LoggerConfig } from 'react-native-worklets';
import { updateLoggerConfig } from 'react-native-worklets';

import { SHOULD_BE_USE_WEB } from './common';
import {
  executeOnUIRuntimeSync,
  jsiRegisterNativePropNamesForComponentName,
} from './core';

export function addWhitelistedNativeProps(): void {
  console.warn(
    '[Reanimated] `addWhitelistedNativeProps` is no longer necessary in Reanimated 4 and will be removed in next version. Please remove this call from your code.'
  );
}

export function addWhitelistedUIProps(): void {
  console.warn(
    '[Reanimated] `addWhitelistedUIProps` is no longer necessary in Reanimated 4 and will be removed in next version. Please remove this call from your code.'
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

const PROCESSED_VIEW_NAMES = new Set();

export interface ViewConfig {
  uiViewClassName: string;
  validAttributes: Record<string, unknown>;
}

export function adaptViewConfig(viewConfig: ViewConfig): void {
  const componentName = viewConfig.uiViewClassName;
  if (PROCESSED_VIEW_NAMES.has(componentName)) {
    return;
  }
  const nativePropNames = Object.keys(viewConfig.validAttributes);
  jsiRegisterNativePropNamesForComponentName(componentName, nativePropNames);
  PROCESSED_VIEW_NAMES.add(componentName);
}
