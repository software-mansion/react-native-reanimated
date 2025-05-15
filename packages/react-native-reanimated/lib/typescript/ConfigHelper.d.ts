import type { LoggerConfig } from 'react-native-worklets';
export declare function configureProps(): void;
export declare function addWhitelistedNativeProps(props: Record<string, boolean>): void;
export declare function addWhitelistedUIProps(props: Record<string, boolean>): void;
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
export interface ViewConfig {
    uiViewClassName: string;
    validAttributes: Record<string, unknown>;
}
/**
 * Updates UI props whitelist for given view host instance this will work just
 * once for every view name
 */
export declare function adaptViewConfig(viewConfig: ViewConfig): void;
//# sourceMappingURL=ConfigHelper.d.ts.map