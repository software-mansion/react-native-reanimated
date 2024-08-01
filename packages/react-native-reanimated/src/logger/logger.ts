import type { LogLevel } from './LogBox';
import { LogBox } from './LogBox';

type LogOptions = {
  trim?: string;
};

function createLogger(prefix: string) {
  const formatMessage = (message: string) => `${prefix} ${message}`;

  const warn = (message: string, options: LogOptions = {}) => {
    output('warn', message, options);
  };

  const error = (message: string, options: LogOptions = {}) => {
    output('error', message, options);
  };

  const fatal = (message: string, options: LogOptions = {}) => {
    output('fatal', message, options);
  };

  const throwError = (message: string) => {
    const formattedMessage = formatMessage(message);
    throw new Error(formattedMessage);
  };

  const output = (level: LogLevel, message: string, options: LogOptions) => {
    const { trim } = options;
    const formattedMessage = formatMessage(message);
    const errorStack = new Error().stack;
    const stack = trim ? getTrimmedStackTrace(trim, errorStack) : errorStack;

    LogBox.addLog({
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

  const getTrimmedStackTrace = (trimStackUpTo: string, errorStack?: string) => {
    const regex = new RegExp(trimStackUpTo);
    const stackLines = errorStack?.split('\n') || [];

    // Find the index of the first occurrence that matches the regex
    const trimIndex = stackLines.findIndex((line) => regex.test(line));

    // If a match is found, slice the stack up to that point (exclusive)
    const trimmedStack =
      trimIndex >= 0 ? stackLines.slice(trimIndex + 1) : stackLines;

    return trimmedStack.join('\n');
  };

  return {
    warn,
    error,
    fatal,
    throw: throwError,
  };
}

export const logger = createLogger('[Reanimated]');
