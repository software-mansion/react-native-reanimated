'use strict';
import {
  DEFAULT_LOGGER_CONFIG,
  IS_WEB,
  registerLoggerConfig,
  SHOULD_BE_USE_WEB,
} from './common';
import { executeOnUIRuntimeSync } from './core';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  ReanimatedModule: IReanimatedModule
) {
  if (IS_WEB) {
    return;
  }
  if (!ReanimatedModule) {
    throw new ReanimatedError(
      'Tried to initialize Reanimated without a valid ReanimatedModule'
    );
  }
}

registerLoggerConfig(DEFAULT_LOGGER_CONFIG);
if (!SHOULD_BE_USE_WEB) {
  executeOnUIRuntimeSync(registerLoggerConfig)(DEFAULT_LOGGER_CONFIG);
}
