'use strict';

import { ReanimatedError } from "../../common/index.js";
export const ERROR_MESSAGES = {
  invalidStepsNumber: stepsNumber => `Steps easing function accepts only positive integers as numbers of steps, ${stepsNumber} isn't a one`
};
export class StepsEasing {
  static easingName = 'steps';
  constructor(stepsNumber, modifier = 'jump-end') {
    if (stepsNumber <= 0 || stepsNumber % 1 !== 0) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidStepsNumber(stepsNumber));
    }
    this.stepsNumber = stepsNumber;
    this.modifier = modifier;
  }
  toString() {
    return `${StepsEasing.easingName}(${this.stepsNumber}, ${this.modifier})`;
  }
  normalize() {
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
  jumpNone() {
    const points = [];
    const div = this.stepsNumber - 1;
    for (let i = 0; i < this.stepsNumber; i++) {
      points.push({
        x: i / this.stepsNumber,
        y: i / div
      });
    }
    return this.withName(points);
  }
  jumpStart() {
    const points = [];
    for (let i = 0; i < this.stepsNumber; i++) {
      points.push({
        x: i / this.stepsNumber,
        y: (i + 1) / this.stepsNumber
      });
    }
    return this.withName(points);
  }
  jumpEnd() {
    const points = [];
    for (let i = 0; i < this.stepsNumber; i++) {
      points.push({
        x: i / this.stepsNumber,
        y: i / this.stepsNumber
      });
    }
    // Final jump
    points.push({
      x: 1,
      y: 1
    });
    return this.withName(points);
  }
  jumpBoth() {
    const points = [];
    const div = this.stepsNumber + 1;
    for (let i = 0; i < this.stepsNumber; i++) {
      points.push({
        x: i / this.stepsNumber,
        y: (i + 1) / div
      });
    }
    // Final jump
    points.push({
      x: 1,
      y: 1
    });
    return this.withName(points);
  }
  withName(points) {
    return {
      name: StepsEasing.easingName,
      points
    };
  }
}
//# sourceMappingURL=steps.js.map