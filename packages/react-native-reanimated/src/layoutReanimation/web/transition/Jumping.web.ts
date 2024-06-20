'use strict';
import type { TransitionData } from '../animationParser';

const jumpHeight = 100;

export function JumpingTransition(
  name: string,
  transitionData: TransitionData
) {
  const { translateX, translateY, scaleX, scaleY } = transitionData;

  const dx = translateX / 3;

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
      },
      25: {
        transform: [
          {
            translateX: `${translateX - dx}px`,
            translateY: `${translateY - jumpHeight}px`,
            scale: `${scaleX},${scaleY}`,
          },
        ],
      },
      75: {
        transform: [
          {
            translateX: `${dx}px`,
            translateY: `${translateY - jumpHeight}px`,
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
