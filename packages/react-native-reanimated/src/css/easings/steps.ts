'use strict';
import { ReanimatedError } from '../../common';
import type { Point } from '../types';
import type {
  NormalizedStepsEasing,
  ParametrizedTimingFunction,
  StepsModifier,
} from './types';

export const ERROR_MESSAGES = {
  invalidStepsNumber: (stepsNumber: number) =>
    `Steps easing function accepts only positive integers as numbers of steps, ${stepsNumber} isn't a one`,
};

export class StepsEasing implements ParametrizedTimingFunction {
  static readonly easingName = 'steps';
  readonly stepsNumber: number;
  readonly modifier: StepsModifier;

  constructor(stepsNumber: number, modifier: StepsModifier = 'jump-end') {
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
    switch (this.modifier) {
      case 'jump-start':
      case 'start':
        return this.jumpStart();
      case 'jump-end':
      case 'end':
        return this.jumpEnd();
      case 'jump-both':
        return this.jumpBoth();
      case 'jump-none':
      default:
        if (this.stepsNumber === 1) {
          // CSS animations standard returns here linear easing
          return 'linear';
        }
        return this.jumpNone();
    }
  }

  private jumpNone() {
    const points: Point[] = [];
    const div = this.stepsNumber - 1;

    for (let i = 0; i < this.stepsNumber; i++) {
      points.push({ x: i / this.stepsNumber, y: i / div });
    }

    return this.withName(points);
  }

  private jumpStart() {
    const points: Point[] = [];

    for (let i = 0; i < this.stepsNumber; i++) {
      points.push({ x: i / this.stepsNumber, y: (i + 1) / this.stepsNumber });
    }

    return this.withName(points);
  }

  private jumpEnd() {
    const points: Point[] = [];

    for (let i = 0; i < this.stepsNumber; i++) {
      points.push({ x: i / this.stepsNumber, y: i / this.stepsNumber });
    }
    // Final jump
    points.push({ x: 1, y: 1 });

    return this.withName(points);
  }

  private jumpBoth() {
    const points: Point[] = [];
    const div = this.stepsNumber + 1;

    for (let i = 0; i < this.stepsNumber; i++) {
      points.push({ x: i / this.stepsNumber, y: (i + 1) / div });
    }
    // Final jump
    points.push({ x: 1, y: 1 });

    return this.withName(points);
  }

  private withName(points: Point[]) {
    return {
      name: StepsEasing.easingName,
      points,
    };
  }
}
