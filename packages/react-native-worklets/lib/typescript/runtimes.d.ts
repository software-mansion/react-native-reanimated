import type { WorkletFunction, WorkletRuntime } from './workletTypes';
/**
 * Lets you create a new JS runtime which can be used to run worklets possibly
 * on different threads than JS or UI thread.
 *
 * @param config - Runtime configuration object - {@link WorkletRuntimeConfig}.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<worklets::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime/
 */
export declare function createWorkletRuntime(config?: WorkletRuntimeConfig): WorkletRuntime;
/**
 * @deprecated Please use the new config object signature instead:
 *   `createWorkletRuntime({ name, initializer })`
 *
 *   Lets you create a new JS runtime which can be used to run worklets possibly
 *   on different threads than JS or UI thread.
 * @param name - A name used to identify the runtime which will appear in
 *   devices list in Chrome DevTools.
 * @param initializer - An optional worklet that will be run synchronously on
 *   the same thread immediately after the runtime is created.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<worklets::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime/
 */
export declare function createWorkletRuntime(name?: string, initializer?: () => void): WorkletRuntime;
/** @deprecated Use `scheduleOnRuntime` instead. */
export declare function runOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue): WorkletFunction<Args, ReturnValue>;
/**
 * Lets you asynchronously run a
 * [worklet](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worklet)
 * on the [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worker-worklet-runtime---worker-runtime).
 *
 * Check
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds}
 * for more information about the different runtime kinds.
 *
 * - The worklet is scheduled on the Worker Runtime's [Async
 *   Queue](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/Common/cpp/worklets/Public/AsyncQueue.h)
 * - The function cannot be scheduled on the Worker Runtime from [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime)
 *   or another [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worker-worklet-runtime---worker-runtime),
 *   unless the [Bundle
 *   Mode](https://docs.swmansion.com/react-native-worklets/docs/experimental/bundleMode)
 *   is enabled.
 *
 * @param workletRuntime - The runtime to schedule the worklet on.
 * @param worklet - The worklet to schedule.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
export declare function scheduleOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue, ...args: Args): void;
/** Configuration object for creating a worklet runtime. */
export type WorkletRuntimeConfig = {
    /** The name of the worklet runtime. */
    name?: string;
    /**
     * A worklet that will be run immediately after the runtime is created and
     * before any other worklets.
     */
    initializer?: () => void;
    /**
     * Time interval in milliseconds between polling of frame callbacks scheduled
     * by requestAnimationFrame. If not specified, it defaults to 16 ms.
     */
    animationQueuePollingRate?: number;
    /**
     * Determines whether to enable the default Event Loop or not. The Event Loop
     * provides implementations for `setTimeout`, `setImmediate`, `setInterval`,
     * `requestAnimationFrame`, `queueMicrotask`, `clearTimeout`, `clearInterval`,
     * `clearImmediate`, and `cancelAnimationFrame` methods. If not specified, it
     * defaults to `true`.
     */
    enableEventLoop?: true;
} & ({
    /**
     * If true, the runtime will use the default queue implementation for
     * scheduling worklets. Defaults to true.
     */
    useDefaultQueue?: true;
    /**
     * An optional custom queue to be used for scheduling worklets.
     *
     * The queue has to implement the C++ `AsyncQueue` interface from
     * `<worklets/Public/AsyncQueue.h>`.
     */
    customQueue?: never;
} | {
    /**
     * If true, the runtime will use the default queue implementation for
     * scheduling worklets. Defaults to true.
     */
    useDefaultQueue: false;
    /**
     * An optional custom queue to be used for scheduling worklets.
     *
     * The queue has to implement the C++ `AsyncQueue` interface from
     * `<worklets/Public/AsyncQueue.h>`.
     */
    customQueue?: object;
});
//# sourceMappingURL=runtimes.d.ts.map