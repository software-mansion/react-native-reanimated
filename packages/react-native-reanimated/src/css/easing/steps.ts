'use strict';
import { ReanimatedError } from '../errors';
import type {
  NormalizedStepsEasing,
  ParametrizedTimingFunction,
  StepsModifier,
} from './types';

const ERROR_MESSAGES = {
  invalidStepsNumber: (stepsNumber: number) =>
    `Steps easing function accepts only positive integers as numbers of steps, ${stepsNumber} isn't a one`,
};

export class StepsEasing implements ParametrizedTimingFunction {
  static readonly easingName = 'steps';
  readonly stepsNumber: number;
  readonly modifier: StepsModifier;

  constructor(stepsNumber: number, modifier: StepsModifier = 'jumpEnd') {
    if (stepsNumber <= 0 || stepsNumber % 1 !== 0) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidStepsNumber(stepsNumber));
    }
    this.stepsNumber = stepsNumber;
    this.modifier = modifier;
  }

  toString(): string {
    return `${StepsEasing.easingName}(${this.stepsNumber}, ${this.modifier})`;
  }

  normalize(): NormalizedStepsEasing | 'linear' {
    const stepsX: number[] = [];
    const stepsY: number[] = [];

    switch (this.modifier) {
      case 'jumpStart':
      case 'start':
        this.jumpStart(stepsX, stepsY);
        break;
      case 'jumpEnd':
      case 'end':
        this.jumpEnd(stepsX, stepsY);
        break;
      case 'jumpBoth':
        this.jumpBoth(stepsX, stepsY);
        break;
      case 'jumpNone':
      default:
        if (this.stepsNumber === 1) {
          // CSS animations standard returns here linear easing
          return 'linear';
        }
        this.jumpNone(stepsX, stepsY);
        break;
    }

    return {
      name: StepsEasing.easingName,
      stepsX,
      stepsY,
    };
  }

  private jumpNone(stepsX: number[], stepsY: number[]) {
    const stepLength = 1 / this.stepsNumber;
    const stepsDistance = 1 / (this.stepsNumber - 1);
    for (let i = 0; i < this.stepsNumber; i++) {
      stepsX.push(i * stepLength);
      stepsY.push(i * stepsDistance);
    }
  }

  private jumpStart(stepsX: number[], stepsY: number[]) {
    const stepLength = 1 / this.stepsNumber;
    const stepDistance = 1 / this.stepsNumber;
    const initialJump = 1 / this.stepsNumber;
    for (let i = 0; i < this.stepsNumber; i++) {
      stepsX.push(i * stepLength);
      stepsY.push(initialJump + i * stepDistance);
    }
  }

  private jumpEnd(stepsX: number[], stepsY: number[]) {
    const stepLength = 1 / this.stepsNumber;
    const stepDistance = 1 / this.stepsNumber;
    for (let i = 0; i < this.stepsNumber; i++) {
      stepsX.push(i * stepLength);
      stepsY.push(i * stepDistance);
    }
    // Final jump
    stepsX.push(1);
    stepsY.push(1);
  }

  private jumpBoth(stepsX: number[], stepsY: number[]) {
    const stepLength = 1 / this.stepsNumber;
    const stepDistance = 1 / (this.stepsNumber + 1);
    const initialJump = 1 / (this.stepsNumber + 1);
    for (let i = 0; i < this.stepsNumber; i++) {
      stepsX.push(i * stepLength);
      stepsY.push(initialJump + i * stepDistance);
    }
    // Final jump
    stepsX.push(1);
    stepsY.push(1);
  }
}
