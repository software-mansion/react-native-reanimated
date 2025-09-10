import type { RuntimeKind } from './runtimeKind';
export {};
declare global {
    /**
     * @deprecated Use {@link __RUNTIME_KIND} instead.
     *
     *   This global variable is a diagnostic/development tool.
     *
     *   It's `true` on Worklet Runtimes and `false` on React Native Runtime.
     */
    var _WORKLET: boolean | undefined;
    /**
     * This ArrayBuffer contains the memory address of `jsi::Runtime` which is the
     * Reanimated UI runtime.
     */
    var _WORKLET_RUNTIME: ArrayBuffer;
    /** @deprecated Don't use. */
    var _IS_FABRIC: boolean | undefined;
    /**
     * This global variable is used to determine the kind of the current runtime.
     * You can use it directly to differentiate between runtimes. However, the
     * recommended way for differentiating is to use the {@link getRuntimeKind}
     * function.
     *
     * - Value _1_: React Native Runtime
     * - Value _2_: UI Worklet Runtime
     * - Value _3_: Worker Worklet Runtime
     */
    var __RUNTIME_KIND: RuntimeKind | 1 | 2 | 3;
}
//# sourceMappingURL=publicGlobals.d.ts.map