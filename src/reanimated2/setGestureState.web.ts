'use strict';

export const setGestureState: (
  handlerTag: number,
  newState: number
) => void = () => {
  console.warn('[Reanimated] setGestureState() is not available on web.');
};
