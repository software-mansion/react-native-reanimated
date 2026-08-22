'use strict';
import type { TransitionData } from '../animationParser';

export function SequencedTransition(
  name: string,
  transitionData: TransitionData
) {
  const { translateX, translateY, scaleX, scaleY, reversed } = transitionData;

  // At the midpoint one axis has finished and the other has not started yet.
  // Without `reversed` that is the X axis and the width, so the X component
  // is already 1 while the Y component still holds its starting ratio - the
  // same split the translate values below use.
  const scaleValue = reversed ? `${scaleX},1` : `1,${scaleY}`;

  const sequencedTransition = {
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
