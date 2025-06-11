'use strict';

const PREFIX = '[Worklets]';

export enum LogLevel {
  warn = 1,
  error = 2,
}

type LogData = {
  level: LogLevel;
  message: string;
};

type LogFunction = (data: LogData) => void;

export type LoggerConfig = {
  level?: LogLevel;
};

export type LoggerConfigInternal = {
  logFunction: LogFunction;
} & Required<LoggerConfig>;

function logToConsole(data: LogData) {
  'worklet';
  switch (data.level) {
    case LogLevel.warn:
      console.warn(data.message);
      break;
    case LogLevel.error:
      console.error(data.message);
      break;
  }
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfigInternal = {
  logFunction: logToConsole,
  level: LogLevel.warn,
};

/**
 * Registers the logger configuration. use it only for Worklet runtimes.
 *
 * @param config - The config to register.
 */
export function registerLoggerConfig(config: LoggerConfigInternal) {
  'worklet';
  global.__workletsLoggerConfig = config;
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
export function updateLoggerConfig(options?: Partial<LoggerConfig>) {
  'worklet';
  registerLoggerConfig({
    ...global.__workletsLoggerConfig,
    // Don't reuse previous level values from the global config
    level: options?.level ?? DEFAULT_LOGGER_CONFIG.level,
  });
}

function handleLog(level: LogLevel, message: string) {
  'worklet';
  const config = global.__workletsLoggerConfig;
  if (
    // Don't log if the log level is below the minimum configured level
    level < config.level
  ) {
    return;
  }

  config.logFunction({
    level,
    message: `${PREFIX} ${message}`,
  });
}

export const logger = {
  warn(message: string) {
    'worklet';
    handleLog(LogLevel.warn, message);
  },
  error(message: string) {
    'worklet';
    handleLog(LogLevel.error, message);
  },
};
