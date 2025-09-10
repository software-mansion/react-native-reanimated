export declare enum RuntimeKind {
    /**
     * The React Native runtime, which is the main runtime for React Native where
     * React exists and where components are rendered.
     */
    ReactNative = 1,
    /**
     * The UI runtime, which is a special runtime that executes on the UI thread,
     * mostly used for animations and gestures.
     */
    UI = 2,
    /** Additional runtime created on-demand by the user. */
    Worker = 3
}
/**
 * Programmatic way to check the current runtime kind. It's useful when you need
 * specific implementations for different runtimes created by Worklets.
 *
 * For more optimized calls you can check the value of
 * `globalThis.__RUNTIME_KIND` directly.
 *
 * @returns The kind of the current runtime.
 */
export declare function getRuntimeKind(): RuntimeKind;
//# sourceMappingURL=runtimeKind.d.ts.map