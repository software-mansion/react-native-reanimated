import type { WrapperRef } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
/** An object which contains relative coordinates. */
export interface ComponentCoords {
    x: number;
    y: number;
}
/**
 * Lets you determines the location on the screen, relative to the given view.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to get the coordinates from.
 * @param absoluteX - A number which is an absolute x coordinate.
 * @param absoluteY - A number which is an absolute y coordinate.
 * @returns An object which contains relative coordinates -
 *   {@link ComponentCoords}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/utilities/getRelativeCoords
 */
export declare function getRelativeCoords<TRef extends WrapperRef>(animatedRef: AnimatedRef<TRef>, absoluteX: number, absoluteY: number): ComponentCoords | null;
//# sourceMappingURL=getRelativeCoords.d.ts.map