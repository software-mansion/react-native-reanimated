'use strict';
import type { LoggerConfig } from 'react-native-worklets';
import { updateLoggerConfig } from 'react-native-worklets';

import { SHOULD_BE_USE_WEB } from './common';
import { executeOnUIRuntimeSync, jsiRegisterNativePropsForView } from './core';

export function registerNativePropsForView(
  viewName: string,
  nativePropNames: string[]
): void {
  jsiRegisterNativePropsForView(viewName, nativePropNames);
}

export function addWhitelistedNativeProps(): void {
  // TODO: add deprecated warning
}

export function addWhitelistedUIProps(): void {
  // TODO: add deprecated warning
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
  const viewName = viewConfig.uiViewClassName;
  if (!PROCESSED_VIEW_NAMES.has(viewName)) {
    const nativePropNames = Object.keys(viewConfig.validAttributes);
    registerNativePropsForView(viewName, nativePropNames);
    PROCESSED_VIEW_NAMES.add(viewName);
  }
}
