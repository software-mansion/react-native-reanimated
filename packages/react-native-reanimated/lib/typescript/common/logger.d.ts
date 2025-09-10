export declare enum ReanimatedLogLevel {
    warn = 1,
    error = 2
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
export declare const DEFAULT_LOGGER_CONFIG: LoggerConfigInternal;
/**
 * Registers the logger configuration. use it only for Worklet runtimes.
 *
 * @param config - The config to register.
 */
export declare function registerLoggerConfig(config: LoggerConfigInternal): void;
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