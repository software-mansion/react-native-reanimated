import type { WorkletFunction, WorkletRuntime } from './workletTypes';
/**
 * Lets you create a new JS runtime which can be used to run worklets possibly
 * on different threads than JS or UI thread.
 *
 * @param name - A name used to identify the runtime which will appear in
 *   devices list in Chrome DevTools.
 * @param initializer - An optional worklet that will be run synchronously on
 *   the same thread immediately after the runtime is created.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<worklets::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/createWorkletRuntime
 */
export declare function createWorkletRuntime(name: string, initializer?: () => void): WorkletRuntime;
export declare function runOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue): WorkletFunction<Args, ReturnValue>;
//# sourceMappingURL=runtimes.d.ts.map