'use strict';
import type { TransitionData } from '../animationParser';

export function LinearTransition(name: string, transitionData: TransitionData) {
  const { translateX, translateY, scaleX, scaleY } = transitionData;

  const linearTransition = {
    name,
    style: {
      0: {
        transform: [
          {
            translateX: `${translateX}px`,
            translateY: `${translateY}px`,
            scale: `${scaleX},${scaleY}`,
          },
        ],
      },
    },
    duration: 300,
  };

  return linearTransition;
}
