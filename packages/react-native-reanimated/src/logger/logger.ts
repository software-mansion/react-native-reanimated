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

export type LoggerConfig = {
  level?: 'warn' | 'error';
  strict?: boolean;
};

type LogFunction = (data: LogData) => void;

export const config: Required<LoggerConfig> & { logFunction: LogFunction } = {
  logFunction: logToConsole,
  level: 'warn',
  strict: false,
};

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
 * Replaces the default log function with a custom implementation.
 *
 * @param logFunction - The custom log function.
 */
export function replaceLoggerImplementation(logFunction: LogFunction) {
  config.logFunction = logFunction;
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
