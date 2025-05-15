import type { LogData } from './LogBox';
type LogFunction = (data: LogData) => void;
export declare enum LogLevel {
    warn = 1,
    error = 2
}
export type LoggerConfig = {
    level?: LogLevel;
    strict?: boolean;
};
export type LoggerConfigInternal = {
    logFunction: LogFunction;
} & Required<LoggerConfig>;
export declare const DEFAULT_LOGGER_CONFIG: LoggerConfigInternal;
/**
 * Function that logs to LogBox and console. Used to replace the default console
 * logging with logging to LogBox on the UI thread when runOnJS is available.
 *
 * @param data - The details of the log.
 */
export declare function logToLogBoxAndConsole(data: LogData): void;
/**
 * Registers the logger configuration. use it only for Worklet runtimes.
 *
 * @param config - The config to register.
 */
export declare function registerLoggerConfig(config: LoggerConfigInternal): void;
/**
 * Replaces the default log function with a custom implementation.
 *
 * @param logFunction - The custom log function.
 */
export declare function replaceLoggerImplementation(logFunction: LogFunction): void;
/**
 * Updates logger configuration.
 *
 * @param options - The new logger configuration to apply.
 *
 *   - Level: The minimum log level to display.
 *   - Strict: Whether to log warnings and errors that are not strict. Defaults to
 *       false.
 */
export declare function updateLoggerConfig(options?: Partial<LoggerConfig>): void;
type LogOptions = {
    strict?: boolean;
};
export declare const logger: {
    warn(message: string, options?: LogOptions): void;
    error(message: string, options?: LogOptions): void;
};
export {};
//# sourceMappingURL=logger.d.ts.map