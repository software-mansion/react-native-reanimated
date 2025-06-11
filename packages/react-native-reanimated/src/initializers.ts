'use strict';
import { IS_WEB } from './common';
import type { IReanimatedModule } from './ReanimatedModule';
import {
  DEFAULT_LOGGER_CONFIG,
  registerLoggerConfig,
  SHOULD_BE_USE_WEB,
} from './common';
import { executeOnUIRuntimeSync } from './core';

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

// the React runtime global scope
if (!globalThis._WORKLET) {
  registerLoggerConfig(DEFAULT_LOGGER_CONFIG);

  if (!SHOULD_BE_USE_WEB) {
    executeOnUIRuntimeSync(registerLoggerConfig)(DEFAULT_LOGGER_CONFIG);
  }
}
