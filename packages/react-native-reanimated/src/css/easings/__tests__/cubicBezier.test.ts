'use strict';
import { CubicBezierEasing, ERROR_MESSAGES } from '../cubicBezier';

describe(CubicBezierEasing, () => {
  describe('constructor', () => {
    it('throws error if x1 is not between 0 and 1', () => {
      expect(() => new CubicBezierEasing(1.5, 0.75, 0.5, 0.25)).toThrow(
        ERROR_MESSAGES.invalidCoordinate('x1', 1.5)
      );
    });

    it('throws error if x2 is not between 0 and 1', () => {
      expect(() => new CubicBezierEasing(0.5, 0.75, 1.5, 0.25)).toThrow(
        ERROR_MESSAGES.invalidCoordinate('x2', 1.5)
      );
    });
  });

  describe('toString', () => {
    it('returns correct string', () => {
      const easing = new CubicBezierEasing(0.25, 0.75, 0.5, 1.5);
      expect(easing.toString()).toBe('cubicBezier(0.25, 0.75, 0.5, 1.5)');
    });
  });

  describe('normalize', () => {
    it('returns correct normalized object', () => {
      const easing = new CubicBezierEasing(0.25, 0.75, 0.5, 1.5);
      expect(easing.normalize()).toEqual({
        name: 'cubicBezier',
        x1: 0.25,
        y1: 0.75,
        x2: 0.5,
        y2: 1.5,
      });
    });
  });
});
