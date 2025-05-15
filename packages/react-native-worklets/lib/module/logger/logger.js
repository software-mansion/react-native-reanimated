'use strict';

import { addLogBoxLog } from "./LogBox.js";
const DOCS_URL = 'https://docs.swmansion.com/react-native-reanimated/docs/debugging/logger-configuration';
const DOCS_REFERENCE = `If you don't want to see this message, you can disable the \`strict\` mode. Refer to:\n${DOCS_URL} for more details.`;
export let LogLevel = /*#__PURE__*/function (LogLevel) {
  LogLevel[LogLevel["warn"] = 1] = "warn";
  LogLevel[LogLevel["error"] = 2] = "error";
  return LogLevel;
}({});
function logToConsole(data) {
  'worklet';

  switch (data.level) {
    case 'warn':
      console.warn(data.message.content);
      break;
    case 'error':
    case 'fatal':
    case 'syntax':
      console.error(data.message.content);
      break;
  }
}
export const DEFAULT_LOGGER_CONFIG = {
  logFunction: logToConsole,
  level: LogLevel.warn,
  strict: true
};
function formatMessage(message) {
  'worklet';

  return `[Worklets] ${message}`;
}
function createLog(level, message) {
  'worklet';

  const formattedMessage = formatMessage(message);
  return {
    level,
    message: {
      content: formattedMessage,
      substitutions: []
    },
    category: formattedMessage,
    componentStack: [],
    componentStackType: null,
    // eslint-disable-next-line reanimated/use-worklets-error
    stack: new Error().stack
  };
}

/**
 * Function that logs to LogBox and console. Used to replace the default console
 * logging with logging to LogBox on the UI thread when runOnJS is available.
 *
 * @param data - The details of the log.
 */
export function logToLogBoxAndConsole(data) {
  addLogBoxLog(data);
  logToConsole(data);
}

/**
 * Registers the logger configuration. use it only for Worklet runtimes.
 *
 * @param config - The config to register.
 */
export function registerLoggerConfig(config) {
  'worklet';

  global.__workletsLoggerConfig = config;
}

/**
 * Replaces the default log function with a custom implementation.
 *
 * @param logFunction - The custom log function.
 */
export function replaceLoggerImplementation(logFunction) {
  'worklet';

  registerLoggerConfig({
    ...global.__workletsLoggerConfig,
    logFunction
  });
}

/**
 * Updates logger configuration.
 *
 * @param options - The new logger configuration to apply.
 *
 *   - Level: The minimum log level to display.
 *   - Strict: Whether to log warnings and errors that are not strict. Defaults to
 *       false.
 */
export function updateLoggerConfig(options) {
  'worklet';

  registerLoggerConfig({
    ...global.__workletsLoggerConfig,
    // Don't reuse previous level and strict values from the global config
    level: options?.level ?? DEFAULT_LOGGER_CONFIG.level,
    strict: options?.strict ?? DEFAULT_LOGGER_CONFIG.strict
  });
}
function handleLog(level, message, options) {
  'worklet';

  const config = global.__workletsLoggerConfig;
  if (
  // Don't log if the log is marked as strict-only and the config doesn't
  // enable strict logging
  options.strict && !config.strict ||
  // Don't log if the log level is below the minimum configured level
  LogLevel[level] < config.level) {
    return;
  }
  if (options.strict) {
    message += `\n\n${DOCS_REFERENCE}`;
  }
  config.logFunction(createLog(level, message));
}
export const logger = {
  warn(message, options = {}) {
    'worklet';

    handleLog('warn', message, options);
  },
  error(message, options = {}) {
    'worklet';

    handleLog('error', message, options);
  }
};
//# sourceMappingURL=logger.js.map