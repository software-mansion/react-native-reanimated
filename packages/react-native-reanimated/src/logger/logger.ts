'use strict';
import { runOnJS } from '../threads';
import type { LogData, LogLevel } from './LogBox';
import { LogBox } from './LogBox';

const addLog = LogBox.addLog.bind(LogBox);

function log(data: LogData) {
  addLog(data);

  const consoleMessage = `${data.message.content}\n${data.stack}`;

  // Log message to the console manually as calling LogBox.addLog
  // does not log to the console
  // (app will show only a single message as a result of deduplication
  // mechanism in LogBox, so we can safely log to the console after
  // calling LogBox.addLog)
  switch (data.level) {
    case 'warn':
      console.warn(consoleMessage);
      break;
    case 'error':
    case 'fatal':
      console.error(consoleMessage);
      break;
  }
}

type LogOptions = {
  trimStack?: string | RegExp;
};

function createLogger(prefix: string) {
  const formatMessage = (message: string) => {
    'worklet';
    return `${prefix} ${message}`;
  };

  const getTrimmedStackTrace = (
    errorStack?: string,
    trimStack?: string | RegExp
  ) => {
    'worklet';
    // remove the first line of the stack trace (it is always the Error constructor)
    const stackLines = errorStack?.split('\n') || [];
    // find fist non-Error and non-logger line of the stack trace
    let trimIndex = stackLines.findIndex(
      (line) => !line.includes('Error') && !line.includes('logger')
    );

    if (trimStack) {
      const regex = new RegExp(trimStack);
      for (let i = trimIndex; i < stackLines.length; i++) {
        if (regex.test(stackLines[i])) {
          trimIndex = i + 1;
          break;
        }
      }
    }

    // If a match is found, slice the stack up to that point (exclusive)
    const trimmedStack =
      trimIndex >= 0 ? stackLines.slice(trimIndex) : stackLines;

    console.log({ trimmedStack, trimIndex });

    return trimmedStack.join('\n');
  };

  const output = (level: LogLevel, message: string, options: LogOptions) => {
    'worklet';
    const { trimStack } = options;
    const formattedMessage = formatMessage(message);

    const errorStack = new Error().stack;
    const stack = getTrimmedStackTrace(errorStack, trimStack);
    console.log({ stack });

    runOnJS(log)({
      level,
      message: {
        content: formattedMessage,
        substitutions: [],
      },
      category: formattedMessage,
      componentStack: [],
      componentStackType: null,
      stack,
    });
  };

  const warn = (message: string, options: LogOptions = {}) => {
    'worklet';
    output('warn', message, options);
  };

  const error = (message: string, options: LogOptions = {}) => {
    'worklet';
    output('error', message, options);
  };

  const fatal = (message: string, options: LogOptions = {}) => {
    'worklet';
    output('fatal', message, options);
  };

  const createError = (message: string, options: LogOptions = {}): Error => {
    'worklet';
    const formattedMessage = formatMessage(message);
    const err = new Error(formattedMessage);
    err.stack = getTrimmedStackTrace(err.stack, options.trimStack);
    return err;
  };

  return {
    warn,
    error,
    fatal,
    createError,
  };
}

export const logger = createLogger('[Reanimated]');
