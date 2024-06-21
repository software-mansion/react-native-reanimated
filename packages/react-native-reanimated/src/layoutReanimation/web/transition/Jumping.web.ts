'use strict';
import type { TransitionData } from '../animationParser';
import { Easing } from '../../../Easing';

export function JumpingTransition(
  name: string,
  transitionData: TransitionData
) {
  const { translateX, translateY, scaleX, scaleY } = transitionData;

  const d = Math.max(Math.abs(translateX), Math.abs(translateY)) / 2;
  const peakTranslateY = translateY <= 0 ? translateY - d : -translateY + d;

  const jumpingTransition = {
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
        easing: Easing.exp,
      },
      50: {
        transform: [
          {
            translateX: `${translateX / 2}px`,
            translateY: `${peakTranslateY}px`,
            scale: `${scaleX},${scaleY}`,
          },
        ],
      },
      100: {
        transform: [{ translateX: '0px', translateY: '0px', scale: '1,1' }],
      },
    },
    duration: 300,
  };

  return jumpingTransition;
}
