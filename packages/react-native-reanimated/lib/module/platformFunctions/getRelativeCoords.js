'use strict';

import { measure } from './measure';

/** An object which contains relative coordinates. */

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
export function getRelativeCoords(animatedRef, absoluteX, absoluteY) {
  'worklet';

  const parentCoords = measure(animatedRef);
  if (parentCoords === null) {
    return null;
  }
  return {
    x: absoluteX - parentCoords.pageX,
    y: absoluteY - parentCoords.pageY
  };
}
//# sourceMappingURL=getRelativeCoords.js.map