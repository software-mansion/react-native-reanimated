import type { WorkletFunction } from './workletTypes';
export declare function setupMicrotasks(): void;
export declare const callMicrotasks: () => void;
/**
 * Lets you schedule a function to be executed on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 *
 * - The callback executes asynchronously and doesn't return a value.
 * - Passed function and args are automatically
 *   [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 *   and serialized.
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime)
 *   or [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worker-worklet-runtime---worker-runtime),
 *   unless you have the [Bundle Mode](/docs/experimental/bundleMode) enabled.
 *
 * @param fun - A reference to a function you want to schedule on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 * @param args - Arguments to pass to the function.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnUI
 */
export declare function scheduleOnUI<Args extends unknown[], ReturnValue>(worklet: (...args: Args) => ReturnValue, ...args: Args): void;
/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * functions on the [UI
 * thread](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUI/).
 *
 * This method does not schedule the work immediately but instead waits for
 * other worklets to be scheduled within the same JS loop. It uses
 * queueMicrotask to schedule all the worklets at once making sure they will run
 * within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   thread](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUI/)
 *   from the [JavaScript
 *   thread](https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUI/).
 * @returns A function that accepts arguments for the function passed as the
 *   first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUI @deprecated Use `scheduleOnUI` instead.
 */
export declare function runOnUI<Args extends unknown[], ReturnValue>(worklet: (...args: Args) => ReturnValue): (...args: Args) => void;
/**
 * Lets you run a function synchronously on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime)
 * from the [RN
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#react-native-runtime-rn-runtime).
 * Passed function and args are automatically
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * and serialized.
 *
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 * - This function cannot be called from a [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worker-worklet-runtime---worker-runtime).
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 * @param args - Arguments to pass to the function.
 * @returns The return value of the function passed as the first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUISync
 */
export declare function runOnUISync<Args extends unknown[], ReturnValue>(worklet: (...args: Args) => ReturnValue, ...args: Args): ReturnValue;
export declare function executeOnUIRuntimeSync<Args extends unknown[], ReturnValue>(worklet: (...args: Args) => ReturnValue): (...args: Args) => ReturnValue;
type ReleaseRemoteFunction<Args extends unknown[], ReturnValue> = {
    (...args: Args): ReturnValue;
};
type DevRemoteFunction<Args extends unknown[], ReturnValue> = {
    __remoteFunction: (...args: Args) => ReturnValue;
};
type RemoteFunction<Args extends unknown[], ReturnValue> = ReleaseRemoteFunction<Args, ReturnValue> | DevRemoteFunction<Args, ReturnValue>;
/**
 * Lets you asynchronously run
 * non-[workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * functions that couldn't otherwise run on the [UI
 * thread](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-thread).
 * This applies to most external libraries as they don't have their functions
 * marked with "worklet"; directive.
 *
 * @param fun - A reference to a function you want to execute on the JavaScript
 *   thread from the UI thread.
 * @returns A function that accepts arguments for the function passed as the
 *   first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnJS
 */
/** @deprecated Use `scheduleOnRN` instead. */
export declare function runOnJS<Args extends unknown[], ReturnValue>(fun: ((...args: Args) => ReturnValue) | RemoteFunction<Args, ReturnValue> | WorkletFunction<Args, ReturnValue>): (...args: Args) => void;
/**
 * Lets you schedule a function to be executed on the RN runtime from any
 * runtime. Check
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds}
 * for more information about the different runtime kinds.
 *
 * Scheduling function from the RN Runtime (we are already on RN Runtime) simply
 * uses `queueMicrotask`.
 *
 * When functions need to be scheduled from the UI Runtime, first function and
 * args are serialized and then the system passes the scheduling responsibility
 * to the JSScheduler. The JSScheduler then uses the RN CallInvoker to schedule
 * the function asynchronously on the JavaScript thread by calling
 * `jsCallInvoker_->invokeAsync()`.
 *
 * When called from a Worker Runtime, it uses the same JSScheduler mechanism.
 *
 * @param fun - A function you want to schedule on the RN runtime. A function
 *   can be a worklet, a remote function or a regular function.
 * @param args - Arguments to pass to the function.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN
 */
export declare function scheduleOnRN<Args extends unknown[], ReturnValue>(fun: ((...args: Args) => ReturnValue) | RemoteFunction<Args, ReturnValue> | WorkletFunction<Args, ReturnValue>, ...args: Args): void;
/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#to-workletize)
 * functions on the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 *
 * This method does not schedule the work immediately but instead waits for
 * other worklets to be scheduled within the same JS loop. It uses
 * queueMicrotask to schedule all the worklets at once making sure they will run
 * within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#ui-runtime).
 *   from the [JavaScript
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#javascript-runtime).
 * @returns A promise that resolves to the return value of the function passed
 *   as the first argument.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnUIAsync
 */
export declare function runOnUIAsync<Args extends unknown[], ReturnValue>(worklet: (...args: Args) => ReturnValue): (...args: Args) => Promise<ReturnValue>;
/**
 * Added temporarily for integration with `react-native-audio-api`. Don't depend
 * on this API as it may change without notice.
 */
export declare function unstable_eventLoopTask<TArgs extends unknown[], TRet>(worklet: (...args: TArgs) => TRet): (...args: TArgs) => void;
export {};
//# sourceMappingURL=threads.d.ts.map