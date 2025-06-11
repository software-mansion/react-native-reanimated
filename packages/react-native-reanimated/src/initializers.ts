'use strict';
import {
  DEFAULT_LOGGER_CONFIG,
  registerLoggerConfig,
  SHOULD_BE_USE_WEB,
} from './common';
import { executeOnUIRuntimeSync } from './core';

// the React runtime global scope
if (!globalThis._WORKLET) {
  registerLoggerConfig(DEFAULT_LOGGER_CONFIG);

  if (!SHOULD_BE_USE_WEB) {
    executeOnUIRuntimeSync(registerLoggerConfig)(DEFAULT_LOGGER_CONFIG);
  }
}
