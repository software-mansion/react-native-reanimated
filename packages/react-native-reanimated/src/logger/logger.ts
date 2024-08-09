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

export function logToLogBoxAndConsole(data: LogData) {
  addLogBoxLog(data);
  logToConsole(data);
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

export const loggerImpl = {
  logFunction: logToConsole,
};

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
