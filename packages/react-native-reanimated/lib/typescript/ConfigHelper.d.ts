import type { LoggerConfig } from './common';
/** @deprecated This function is a no-op in Reanimated 4. */
export declare function addWhitelistedNativeProps(_props: Record<string, boolean>): void;
/** @deprecated This function is a no-op in Reanimated 4. */
export declare function addWhitelistedUIProps(_props: Record<string, boolean>): void;
/**
 * Updates Reanimated logger config with the user-provided configuration. Will
 * affect Reanimated code executed after call to this function so it should be
 * called before any Reanimated code is executed to take effect. Each call to
 * this function will override the previous configuration (it's recommended to
 * call it only once).
 *
 * @param config - The new logger configuration to apply.
 */
export declare function configureReanimatedLogger(config: LoggerConfig): void;
//# sourceMappingURL=ConfigHelper.d.ts.map