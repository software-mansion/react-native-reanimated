'use strict';
import { addLogBoxLog } from './LogBox';
import type { LogData, LogBoxLogLevel } from './LogBox';

type LogFunction = (data: LogData) => void;

export enum LogLevel {
  warn = 1,
  error = 2,
  fatal = 3,
}

export type LoggerConfig = {
  level?: LogLevel;
  strict?: boolean;
};

export type LoggerConfigInternal = {
  logFunction: LogFunction;
} & Required<LoggerConfig>;

type LogOptions = {
  strict?: boolean;
};

function logToConsole(data: LogData) {
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

export const __reanimatedLoggerConfig: LoggerConfigInternal = {
  logFunction: logToConsole,
  level: LogLevel.warn,
  strict: false,
};

function formatMessage(message: string) {
  'worklet';
  return `[Reanimated] ${message}`;
}

function createLog(level: LogBoxLogLevel, message: string): LogData {
  'worklet';
  const formattedMessage = formatMessage(message);

  return {
    level,
    message: {
      content: formattedMessage,
      substitutions: [],
    },
    category: formattedMessage,
    componentStack: [],
    componentStackType: null,
    stack: new Error().stack,
  };
}

/**
 * Function that logs to LogBox and console.
 * Used to replace the default console logging with logging to LogBox
 * on the UI thread when runOnJS is available.
 *
 * @param data - The details of the log.
 */
export function logToLogBoxAndConsole(data: LogData) {
  addLogBoxLog(data);
  logToConsole(data);
}

/**
 * Registers the logger configuration.
 * use it only for Worklet runtimes.
 *
 * @param config - The config to register.
 */
export function registerLoggerConfig(config: LoggerConfigInternal) {
  'worklet';
  if (!_WORKLET) {
    throw new Error(
      '[Reanimated] registerLoggerConfig() must be called on Worklet runtime'
    );
  }
  (global as Record<string, unknown>).__reanimatedLoggerConfig = config;
}

/**
 * Updates logger configuration.
 *
 * @param options - The new logger configuration to apply.
 *   - level: The minimum log level to display.
 *   - strict: Whether to log warnings and errors that are not strict.
 *    Defaults to false.
 *   - logFunction: The function to use for logging.
 */
export function updateLoggerConfig(options?: Partial<LoggerConfigInternal>) {
  'worklet';
  // Clone the config in the worklet runtime thus the object sent to
  // the worklet runtime is immutable
  const config = _WORKLET
    ? {
        ...(((global as Record<string, unknown>)
          .__reanimatedLoggerConfig as LoggerConfigInternal) ?? {}),
      }
    : __reanimatedLoggerConfig;

  // Re-use already set logFunction from the global config
  config.logFunction =
    config?.logFunction ?? options?.logFunction ?? logToConsole;
  // Don't reuse previous level and strict values from the global config
  config.level = options?.level ?? LogLevel.warn;
  config.strict = options?.strict ?? false;

  if (_WORKLET) {
    registerLoggerConfig(config);
  }
}

function handleLog(
  level: Exclude<LogBoxLogLevel, 'syntax'>,
  message: string,
  options: LogOptions
) {
  'worklet';
  const config = __reanimatedLoggerConfig;

  if (
    // Don't log if the log is marked as strict-only and the config doesn't
    // enable strict logging
    (options.strict && !config.strict) ||
    // Don't log if the log level is below the minimum configured level
    LogLevel[level] < config.level
  ) {
    return;
  }
  config.logFunction(createLog(level, message));
}

export const logger = {
  warn(message: string, options: LogOptions = {}) {
    'worklet';
    handleLog('warn', message, options);
  },
  error(message: string, options: LogOptions = {}) {
    'worklet';
    handleLog('error', message, options);
  },
  fatal(message: string, options: LogOptions = {}) {
    'worklet';
    handleLog('fatal', message, options);
  },
};
