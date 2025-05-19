import type { SharedValue } from '../commonTypes';
/**
 * Lets you define [shared
 * values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value)
 * in your components.
 *
 * @param initialValue - The value you want to be initially stored to a `.value`
 *   property.
 * @returns A shared value with a single `.value` property initially set to the
 *   `initialValue` - {@link SharedValue}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue
 */
export declare function useSharedValue<Value>(initialValue: Value): SharedValue<Value>;
//# sourceMappingURL=useSharedValue.d.ts.map