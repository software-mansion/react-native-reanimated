'use strict';
import { runOnJS } from '../threads';
import { LogBox } from './LogBox';
import type { LogLevel } from './LogBox';

const addLog = LogBox.addLog.bind(LogBox);

function createLogger(prefix: string) {
  function formatMessage(message: string) {
    'worklet';
    return `${prefix} ${message}`;
  }

  function output(level: LogLevel, message: string) {
    'worklet';
    const formattedMessage = formatMessage(message);

    runOnJS(addLog)({
      level,
      message: {
        content: formattedMessage,
        substitutions: [],
      },
      category: formattedMessage,
      componentStack: [],
      componentStackType: null,
      stack: new Error().stack,
    });
  }

  function warn(message: string) {
    'worklet';
    output('warn', message);
  }

  function error(message: string) {
    'worklet';
    output('error', message);
  }

  function fatal(message: string) {
    'worklet';
    output('fatal', message);
  }

  function newError(message: string): never {
    'worklet';
    const formattedMessage = formatMessage(message);
    throw new Error(formattedMessage);
  }

  return {
    warn,
    error,
    fatal,
    newError,
  };
}

export const logger = createLogger('[Reanimated]');
