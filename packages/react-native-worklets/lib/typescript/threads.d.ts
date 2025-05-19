import type { WorkletFunction } from './workletTypes';
export declare function setupMicrotasks(): void;
export declare const callMicrotasks: () => void;
/**
 * Lets you asynchronously run
 * [workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize)
 * functions on the [UI
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI).
 *
 * This method does not schedule the work immediately but instead waits for
 * other worklets to be scheduled within the same JS loop. It uses
 * queueMicrotask to schedule all the worklets at once making sure they will run
 * within the same frame boundaries on the UI thread.
 *
 * @param fun - A reference to a function you want to execute on the [UI
 *   thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI)
 *   from the [JavaScript
 *   thread](https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI).
 * @returns A function that accepts arguments for the function passed as the
 *   first argument.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnUI
 */
export declare function runOnUI<Args extends unknown[], ReturnValue>(worklet: (...args: Args) => ReturnValue): (...args: Args) => void;
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
 * non-[workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize)
 * functions that couldn't otherwise run on the [UI
 * thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#ui-thread).
 * This applies to most external libraries as they don't have their functions
 * marked with "worklet"; directive.
 *
 * @param fun - A reference to a function you want to execute on the JavaScript
 *   thread from the UI thread.
 * @returns A function that accepts arguments for the function passed as the
 *   first argument.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/threading/runOnJS
 */
export declare function runOnJS<Args extends unknown[], ReturnValue>(fun: ((...args: Args) => ReturnValue) | RemoteFunction<Args, ReturnValue> | WorkletFunction<Args, ReturnValue>): (...args: Args) => void;
export {};
//# sourceMappingURL=threads.d.ts.map