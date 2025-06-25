'use strict';

const PREFIX = '[Reanimated]';
const DOCS_URL =
  'https://docs.swmansion.com/react-native-reanimated/docs/debugging/logger-configuration';
const DOCS_REFERENCE = `If you don't want to see this message, you can disable the \`strict\` mode. Refer to:\n${DOCS_URL} for more details.`;

export enum ReanimatedLogLevel {
  warn = 1,
  error = 2,
}

type LogData = {
  level: ReanimatedLogLevel;
  message: string;
};

type LogFunction = (data: LogData) => void;

export type LoggerConfig = {
  level?: ReanimatedLogLevel;
  strict?: boolean;
};

export type LoggerConfigInternal = {
  logFunction: LogFunction;
} & Required<LoggerConfig>;

function logToConsole(data: LogData) {
  'worklet';
  switch (data.level) {
    case ReanimatedLogLevel.warn:
      console.warn(data.message);
      break;
    case ReanimatedLogLevel.error:
      console.error(data.message);
      break;
  }
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfigInternal = {
  logFunction: logToConsole,
  level: ReanimatedLogLevel.warn,
  strict: true,
};

/**
 * Registers the logger configuration. use it only for Worklet runtimes.
 *
 * @param config - The config to register.
 */
export function registerLoggerConfig(config: LoggerConfigInternal) {
  'worklet';
  global.__reanimatedLoggerConfig = config;
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
    ...global.__reanimatedLoggerConfig,
    // Don't reuse previous level and strict values from the global config
    level: options?.level ?? DEFAULT_LOGGER_CONFIG.level,
    strict: options?.strict ?? DEFAULT_LOGGER_CONFIG.strict,
  });
}

type LogOptions = {
  strict?: boolean;
};

function handleLog(
  level: ReanimatedLogLevel,
  message: string,
  options: LogOptions
) {
  'worklet';
  const config = global.__reanimatedLoggerConfig;
  if (
    // Don't log if the log is marked as strict-only and the config doesn't
    // enable strict logging
    (options.strict && !config.strict) ||
    // Don't log if the log level is below the minimum configured level
    level < config.level
  ) {
    return;
  }

  if (options.strict) {
    message += `\n\n${DOCS_REFERENCE}`;
  }

  config.logFunction({
    level,
    message: `${PREFIX} ${message}`,
  });
}

export const logger = {
  warn(message: string, options: LogOptions = {}) {
    'worklet';
    handleLog(ReanimatedLogLevel.warn, message, options);
  },
  error(message: string, options: LogOptions = {}) {
    'worklet';
    handleLog(ReanimatedLogLevel.error, message, options);
  },
};
