import type { DependencyList } from './commonTypes';
/** @deprecated Use React.useCallback instead */
export declare function useWorkletCallback<Args extends unknown[], ReturnValue>(worklet: (...args: Args) => ReturnValue, deps?: DependencyList): (...args: Args) => ReturnValue;
//# sourceMappingURL=useWorkletCallback.d.ts.map