import type { SharedValue, WrapperRef } from '../commonTypes';
import type { AnimatedRef } from './commonTypes';
/**
 * Lets you synchronously get the current offset of a scrollable component.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef)
 *   attached to a scrollable component.
 * @returns A shared value which holds the current scroll offset of the
 *   scrollable component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/useScrollOffset
 */
export declare const useScrollOffset: typeof useScrollOffsetWeb;
declare function useScrollOffsetWeb<TRef extends WrapperRef>(animatedRef: AnimatedRef<TRef> | null, providedOffset?: SharedValue<number>): SharedValue<number>;
export {};
//# sourceMappingURL=useScrollOffset.d.ts.map