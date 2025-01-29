'use strict';
import { ERROR_MESSAGES, StepsEasing } from '../steps';
import type { StepsModifier } from '../types';

describe(StepsEasing, () => {
  describe('constructor', () => {
    it('throws error if stepsNumber is not positive', () => {
      expect(() => new StepsEasing(-1)).toThrow(
        ERROR_MESSAGES.invalidStepsNumber(-1)
      );
    });

    it('throws error if stepsNumber is not an integer', () => {
      expect(() => new StepsEasing(1.5)).toThrow(
        ERROR_MESSAGES.invalidStepsNumber(1.5)
      );
    });
  });

  describe('toString', () => {
    it.each([
      [1, 'jump-end', 'steps(1, jump-end)'],
      [2, 'jump-start', 'steps(2, jump-start)'],
      [3, 'jump-both', 'steps(3, jump-both)'],
      [4, 'jump-none', 'steps(4, jump-none)'],
    ] satisfies [number, StepsModifier, string][])(
      'returns correct string for %s steps and %s modifier',
      (stepsNumber, modifier, expected) => {
        const easing = new StepsEasing(stepsNumber, modifier);
        expect(easing.toString()).toBe(expected);
      }
    );
  });

  describe('normalize', () => {
    describe('jump-start', () => {
      it('returns correct normalized object', () => {
        const easing = new StepsEasing(4, 'jump-start');
        expect(easing.normalize()).toEqual({
          name: 'steps',
          points: [
            { x: 0, y: 0.25 },
            { x: 0.25, y: 0.5 },
            { x: 0.5, y: 0.75 },
            { x: 0.75, y: 1 },
          ],
        });
      });
    });

    describe('jump-end', () => {
      it('returns correct normalized object', () => {
        const easing = new StepsEasing(4, 'jump-end');
        expect(easing.normalize()).toEqual({
          name: 'steps',
          points: [
            { x: 0, y: 0 },
            { x: 0.25, y: 0.25 },
            { x: 0.5, y: 0.5 },
            { x: 0.75, y: 0.75 },
            { x: 1, y: 1 },
          ],
        });
      });
    });

    describe('jump-both', () => {
      it('returns correct normalized object', () => {
        const easing = new StepsEasing(4, 'jump-both');
        expect(easing.normalize()).toEqual({
          name: 'steps',
          points: [
            { x: 0, y: 0.2 },
            { x: 0.25, y: 0.4 },
            { x: 0.5, y: 0.6 },
            { x: 0.75, y: 0.8 },
            { x: 1, y: 1 },
          ],
        });
      });
    });
  });
});
