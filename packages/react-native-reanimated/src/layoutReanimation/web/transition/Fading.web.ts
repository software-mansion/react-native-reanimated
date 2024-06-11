'use strict';
import type { TransitionData } from '../animationParser';

export function FadingTransition(name: string, transitionData: TransitionData) {
  const { translateX, translateY, scaleX, scaleY } = transitionData;

  const fadingTransition = {
    name,
    style: {
      0: {
        opacity: 1,
        transform: [
          {
            translateX: `${translateX}px`,
            translateY: `${translateY}px`,
            scale: `${scaleX},${scaleY}`,
          },
        ],
      },
      20: {
        opacity: 0,
        transform: [
          {
            translateX: `${translateX}px`,
            translateY: `${translateY}px`,
            scale: `${scaleX},${scaleY}`,
          },
        ],
      },
      60: {
        opacity: 0,
        transform: [
          {
            translateX: '0px',
            translateY: '0px',
            scale: `1,1`,
          },
        ],
      },
      100: {
        opacity: 1,
        transform: [
          {
            translateX: '0px',
            translateY: '0px',
            scale: `1,1`,
          },
        ],
      },
    },
    duration: 300,
  };

  return fadingTransition;
}
