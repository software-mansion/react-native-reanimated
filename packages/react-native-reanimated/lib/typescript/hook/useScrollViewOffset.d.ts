import type { SharedValue } from '../commonTypes';
import type { AnimatedScrollView } from '../component/ScrollView';
import type { AnimatedRef } from './commonTypes';
/**
 * Lets you synchronously get the current offset of a `ScrollView`.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef)
 *   attached to an Animated.ScrollView component.
 * @returns A shared value which holds the current offset of the `ScrollView`.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/useScrollViewOffset
 */
export declare const useScrollViewOffset: typeof useScrollViewOffsetWeb;
declare function useScrollViewOffsetWeb(animatedRef: AnimatedRef<AnimatedScrollView> | null, providedOffset?: SharedValue<number>): SharedValue<number>;
export {};
//# sourceMappingURL=useScrollViewOffset.d.ts.map