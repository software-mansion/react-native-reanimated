'use strict';
import { addLogBoxLog } from './LogBox';
import type { LogLevel, LogData } from './LogBox';

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

function formatMessage(message: string) {
  'worklet';
  return `[Reanimated] ${message}`;
}

function createLog(level: LogLevel, message: string): LogData {
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

type LogFunction = (data: LogData) => void;

export type LoggerConfig = {
  level?: 'warn' | 'error';
  strict?: boolean;
};

export type LoggerConfigInternal = {
  logFunction: LogFunction;
} & Required<LoggerConfig>;

type LogOptions = {
  strict?: boolean;
};

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
 * Updates logger configuration.
 *
 * @param config - The new logger configuration to apply.
 *   - level: The minimum log level to display.
 *   - strict: Whether to log warnings and errors that are not strict.
 *    Defaults to false.
 *   - logFunction: The function to use for logging.
 */
export function updateLoggerConfig(config?: Partial<LoggerConfigInternal>) {
  'worklet';
  global.__loggerConfig = {
    logFunction:
      // Re-use previously assigned log function if it exists
      config?.logFunction ?? global.__loggerConfig?.logFunction ?? logToConsole,
    // Don't reuse previous level and strict values from the global config
    level: config?.level ?? 'warn',
    strict: config?.strict ?? false,
  };
}

const logLevelImportance = {
  warn: 1,
  error: 2,
  fatal: 3,
} as const;

function handleLog(
  level: Exclude<LogLevel, 'syntax'>,
  message: string,
  options: LogOptions
) {
  'worklet';
  const config = global.__loggerConfig;
  if (
    (options.strict && !config.strict) ||
    logLevelImportance[level] < logLevelImportance[config.level]
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
