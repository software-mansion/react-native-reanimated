'use strict';
import type { TransitionData } from '../animationParser';

export function SequencedTransition(
  name: string,
  transitionData: TransitionData
) {
  const { translateX, translateY, scaleX, scaleY, reversed } = transitionData;

  const scaleValue = reversed ? `1,${scaleX}` : `${scaleY},1`;

  const sequencedTransition = {
    name: name,
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
      50: {
        transform: [
          {
            translateX: reversed ? `${translateX}px` : '0px',
            translateY: reversed ? '0px' : `${translateY}px`,
            scale: scaleValue,
          },
        ],
      },
      100: {
        transform: [{ translateX: '0px', translateY: '0px', scale: '1,1' }],
      },
    },
    duration: 300,
  };

  return sequencedTransition;
}
