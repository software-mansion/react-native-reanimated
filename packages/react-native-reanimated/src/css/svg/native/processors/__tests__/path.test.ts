'use strict';

import { ReanimatedError } from '../../../../../common';
import { ERROR_MESSAGES, processSVGPath } from '../path';

describe(processSVGPath, () => {
  describe('M command', () => {
    test.each([
      ['M 10 10', 'M 10 10'],
      ['m 10 10', 'M 10 10'],
      [
        'M 10 10 20 20 30 30',
        'M 10 10 C 13.333333333333334 13.333333333333334 16.666666666666668 16.666666666666668 20 20 C 23.333333333333332 23.333333333333332 26.666666666666668 26.666666666666668 30 30',
      ],
      ['M 10 10 m 20 20', 'M 10 10 M 30 30'],
      ['M 10 10 m 20 20 30 30', 'M 10 10 M 30 30 C 40 40 50 50 60 60'],
      [
        'M 0 0 10 10 0 10 0 0 10 0 10 10',
        'M 0 0 C 3.3333333333333335 3.3333333333333335 6.666666666666667 6.666666666666667 10 10 C 6.666666666666666 10 3.333333333333333 10 0 10 C 0 6.666666666666666 0 3.333333333333333 0 0 C 3.3333333333333335 0 6.666666666666667 0 10 0 C 10 3.3333333333333335 10 6.666666666666667 10 10',
      ],
    ])('for %p returns %p', (input, expected) => {
      expect(processSVGPath(input)).toEqual(expected);
    });
  });

  describe('L, H, V commands', () => {
    test.each([
      ['M 0 0 L 30 30', 'M 0 0 C 10 10 20 20 30 30'],
      ['M 10 10 l 30 30', 'M 10 10 C 20 20 30 30 40 40'],
      ['M 0 0 H 30', 'M 0 0 C 10 0 20 0 30 0'],
      ['M 10 10 h 30', 'M 10 10 C 20 10 30 10 40 10'],
      ['M 0 0 V 30', 'M 0 0 C 0 10 0 20 0 30'],
      ['M 10 10 v 30', 'M 10 10 C 10 20 10 30 10 40'],
      // Implicit L commands (numbers following an L, H, or V that exceed arg length)
      // M 0 0 L 30 30 60 60 -> M 0 0 L 30 30 L 60 60
      ['M 0 0 L 30 30 60 60', 'M 0 0 C 10 10 20 20 30 30 C 40 40 50 50 60 60'],
    ])('for %p returns %p', (input, expected) => {
      expect(processSVGPath(input)).toEqual(expected);
    });
  });

  describe('C and S commands (Cubic)', () => {
    test.each([
      ['M 0 0 C 10 10 20 20 30 30', 'M 0 0 C 10 10 20 20 30 30'],
      ['M 10 10 c 10 10 20 20 30 30', 'M 10 10 C 20 20 30 30 40 40'],
      [
        'M 0 0 C 10 10 20 20 30 30 S 50 50 60 60',
        'M 0 0 C 10 10 20 20 30 30 C 40 40 50 50 60 60',
      ],
      [
        'M 0 0 L 30 30 S 50 50 60 60',
        'M 0 0 C 10 10 20 20 30 30 C 30 30 50 50 60 60',
      ],
    ])('for %p returns %p', (input, expected) => {
      expect(processSVGPath(input)).toEqual(expected);
    });
  });

  describe('Q and T commands', () => {
    test.each([
      ['M 0 0 Q 15 15 30 0', 'M 0 0 C 10 10 20 10 30 0'],
      [
        'M 0 0 Q 15 15 30 0 T 60 0',
        'M 0 0 C 10 10 20 10 30 0 C 40 -10 50 -10 60 0',
      ],
      [
        'M 0 0 Q 30 30 60 0 Q 90 -30 120 0',
        'M 0 0 C 20 20 40 20 60 0 C 80 -20 100 -20 120 0',
      ],
      [
        'M 0 0 L 30 30 T 60 60',
        'M 0 0 C 10 10 20 20 30 30 C 30 30 40 40 60 60',
      ],
      [
        'M 0 0 q 15 15 30 0 t 30 0',
        'M 0 0 C 10 10 20 10 30 0 C 40 -10 50 -10 60 0',
      ],
      [
        'M 0 0 Q 10 10 20 0 T 40 0 T 60 0',
        'M 0 0 C 6.666666666666666 6.666666666666666 13.333333333333334 6.666666666666666 20 0 C 26.666666666666664 -6.666666666666666 33.333333333333336 -6.666666666666666 40 0 C 46.666666666666664 6.666666666666666 53.333333333333336 6.666666666666666 60 0',
      ],
    ])('for %p returns %p', (input, expected) => {
      expect(processSVGPath(input)).toEqual(expected);
    });
  });

  describe('A (Arc) and Z (Close) commands', () => {
    test.each([
      ['M 0 0 A 0 0 0 0 0 30 30', 'M 0 0 C 10 10 20 20 30 30'],
      [
        'M 1 0 A 1 1 0 0 1 0 1',
        'M 1 0 C 1 0.5522847498307933 0.5522847498307935 1 6.123233995736766e-17 1',
      ],
      [
        'M -1 0 A 1 1 0 0 1 1 0',
        'M -1 0 C -1 -0.5522847498307932 -0.5522847498307936 -0.9999999999999999 -1.8369701987210297e-16 -1 C 0.5522847498307931 -1 0.9999999999999999 -0.5522847498307936 1 -2.4492935982947064e-16',
      ],
      [
        'M 1 0 A 1 1 0 0 0 0 1',
        'M 1 0 C 0.44771525016920677 0 1.1102230246251565e-16 0.44771525016920655 0 0.9999999999999999',
      ],
      [
        'M -1 0 A 1 1 0 1 1 1 0',
        'M -1 0 C -1 -0.5522847498307932 -0.5522847498307936 -0.9999999999999999 -1.8369701987210297e-16 -1 C 0.5522847498307931 -1 0.9999999999999999 -0.5522847498307936 1 -2.4492935982947064e-16',
      ],
      [
        'M 0 0 A 1 1 0 0 1 4 0',
        'M 0 0 C 0 -1.1045694996615865 0.8954305003384129 -1.9999999999999998 1.9999999999999996 -2 C 3.1045694996615865 -2 4 -1.1045694996615871 4 -4.898587196589413e-16',
      ],
      [
        'M 0 0 A 2 1 90 0 1 2 2',
        'M 0 0 C 0.2761423749153967 -1.104569499661586 0.9477152501692064 -1.5522847498307932 1.4999999999999998 -1 C 2.052284749830793 -0.4477152501692068 2.2761423749153966 0.8954305003384129 2 1.9999999999999996',
      ],
      ['M 0 0 L 30 30 Z', 'M 0 0 C 10 10 20 20 30 30 Z'],
      [
        'M 0 0 L 10 10 Z M 50 50 L 60 60 Z',
        'M 0 0 C 3.3333333333333335 3.3333333333333335 6.666666666666667 6.666666666666667 10 10 Z M 50 50 C 53.333333333333336 53.333333333333336 56.666666666666664 56.666666666666664 60 60 Z',
      ],
    ])('for %p returns %p', (input, expected) => {
      expect(processSVGPath(input)).toEqual(expected);
    });
  });

  describe('Number Parsing', () => {
    test.each([
      ['M 1e2 10', 'M 100 10'],
      ['M 10 1e-1', 'M 10 0.1'],
      ['M .5 .5', 'M 0.5 0.5'],
      [
        'M 10 10-10-10',
        'M 10 10 C 3.333333333333333 3.333333333333333 -3.333333333333334 -3.333333333333334 -10 -10',
      ],
    ])('for %p returns %p', (input, expected) => {
      expect(processSVGPath(input)).toEqual(expected);
    });
  });

  describe('Validation Errors', () => {
    test.each([
      ['M 10', ERROR_MESSAGES.invalidSVGPathCommand('M', [10])],
      // If M has more than 2 elements, they are porvided in pairs to implicit L commands (which then turn into C commands)
      ['M 10 10 10', ERROR_MESSAGES.invalidSVGPathCommand('L', [10])],
      // Regexp skips all symbols that aren't proper commands so the first one taken is v
      ['invalid', ERROR_MESSAGES.invalidSVGPathStart('v')],
      ['M 0 0 L 10', ERROR_MESSAGES.invalidSVGPathCommand('L', [10])],
      [
        'M 0 0 C 10 10 20 20',
        ERROR_MESSAGES.invalidSVGPathCommand('C', [10, 10, 20, 20]),
      ],
      [
        'M 0 0 A 10 10 0 0 1',
        ERROR_MESSAGES.invalidSVGPathCommand('A', [10, 10, 0, 0, 1]),
      ],
      ['bdd M 10 10', 'M 10 10'],
      ['bad M 10 10', ERROR_MESSAGES.invalidSVGPathStart('a')],
      ['M 10 10 bad', ERROR_MESSAGES.invalidSVGPathCommand('a', [])],
    ])('throws error for %p', (input, expectedMsg) => {
      if (typeof expectedMsg === 'string' && !expectedMsg.includes('Invalid')) {
        expect(processSVGPath(input)).toEqual(expectedMsg);
      } else {
        expect(() => processSVGPath(input)).toThrow(
          new ReanimatedError(expectedMsg)
        );
      }
    });
  });
});
