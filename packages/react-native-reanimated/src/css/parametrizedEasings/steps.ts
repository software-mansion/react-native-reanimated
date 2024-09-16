import type { StepsEasingConfig, StepsModifier } from './types';
import type { CSSAnimationTimingFunction } from '../types';

export function steps(
  stepsNumber: number,
  modifier: StepsModifier = 'jumpEnd'
): StepsEasingConfig | CSSAnimationTimingFunction {
  // We don't support
  if (stepsNumber <= 0 || stepsNumber % 1 !== 0) {
    throw new Error(
      `[Reanimated] Steps easing function accepts only positive integers as numbers of steps, ${stepsNumber} isn't a one`
    );
  }
  const stepsX: number[] = [];
  const stepsY: number[] = [];

  switch (modifier) {
    case 'jumpNone':
      jumpNone(stepsNumber, stepsX, stepsY);
      break;
    case 'jumpStart':
    case 'start':
      jumpStart(stepsNumber, stepsX, stepsY);
      break;
    case 'jumpEnd':
    case 'end':
      jumpEnd(stepsNumber, stepsX, stepsY);
      break;
    case 'jumpBoth':
      jumpBoth(stepsNumber, stepsX, stepsY);
      break;
  }

  return {
    name: 'steps',
    stepsX,
    stepsY,
  };
}

function jumpNone(stepsNumber: number, stepsX: number[], stepsY: number[]) {
  if (stepsNumber === 1) {
    // CSS animations standard returns here linear easing
    return 'linear';
  }
  const stepLength = 1 / stepsNumber;
  const stepsDistance = 1 / (stepsNumber - 1);
  for (let i = 0; i < stepsNumber; i++) {
    stepsX.push(i * stepLength);
    stepsY.push(i * stepsDistance);
  }
}

function jumpStart(stepsNumber: number, stepsX: number[], stepsY: number[]) {
  const stepLength = 1 / stepsNumber;
  const stepDistance = 1 / stepsNumber;
  const initialJump = 1 / stepsNumber;
  for (let i = 0; i < stepsNumber; i++) {
    stepsX.push(i * stepLength);
    stepsY.push(initialJump + i * stepDistance);
  }
}

function jumpEnd(stepsNumber: number, stepsX: number[], stepsY: number[]) {
  const stepLength = 1 / stepsNumber;
  const stepDistance = 1 / stepsNumber;
  for (let i = 0; i < stepsNumber; i++) {
    stepsX.push(i * stepLength);
    stepsY.push(i * stepDistance);
  }
  // Final jump
  stepsX.push(1);
  stepsY.push(1);
}

function jumpBoth(stepsNumber: number, stepsX: number[], stepsY: number[]) {
  const stepLength = 1 / stepsNumber;
  const stepDistance = 1 / (stepsNumber + 1);
  const initialJump = 1 / (stepsNumber + 1);
  for (let i = 0; i < stepsNumber; i++) {
    stepsX.push(i * stepLength);
    stepsY.push(initialJump + i * stepDistance);
  }
  // Final jump
  stepsX.push(1);
  stepsY.push(1);
}
