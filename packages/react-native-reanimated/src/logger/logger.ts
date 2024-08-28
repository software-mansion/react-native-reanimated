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
    // eslint-disable-next-line reanimated/use-reanimated-error
    stack: new Error().stack,
  };
}

const loggerImpl = {
  logFunction: logToConsole,
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
export function replaceLoggerImplementation(
  logFunction: (data: LogData) => void
) {
  loggerImpl.logFunction = logFunction;
}

export const logger = {
  warn(message: string) {
    'worklet';
    loggerImpl.logFunction(createLog('warn', message));
  },
  error(message: string) {
    'worklet';
    loggerImpl.logFunction(createLog('error', message));
  },
  fatal(message: string) {
    'worklet';
    loggerImpl.logFunction(createLog('fatal', message));
  },
};
