'use strict';
import { ReanimatedError } from '../../..';
import { ERROR_MESSAGES, processAspectRatio } from '../others';

describe(processAspectRatio, () => {
  test('returns number as is', () => {
    expect(processAspectRatio(1.5)).toEqual(1.5);
  });

  test('normalizes aspect ratio', () => {
    expect(processAspectRatio('16/9')).toEqual(16 / 9);
  });

  test('throws an error for invalid aspect ratio', () => {
    expect(() => processAspectRatio('invalid')).toThrow(
      new ReanimatedError(ERROR_MESSAGES.unsupportedAspectRatio('invalid'))
    );
  });
});
