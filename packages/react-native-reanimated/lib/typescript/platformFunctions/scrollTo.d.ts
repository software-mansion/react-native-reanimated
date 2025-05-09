import type { Component } from 'react';
import type { AnimatedRef } from '../hook/commonTypes';
type ScrollTo = <T extends Component>(animatedRef: AnimatedRef<T>, x: number, y: number, animated: boolean) => void;
/**
 * Lets you synchronously scroll to a given position of a `ScrollView`.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef)
 *   attached to an `Animated.ScrollView` component.
 * @param x - The x position you want to scroll to.
 * @param y - The y position you want to scroll to.
 * @param animated - Whether the scrolling should be smooth or instant.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/scroll/scrollTo
 */
export declare let scrollTo: ScrollTo;
export {};
//# sourceMappingURL=scrollTo.d.ts.map