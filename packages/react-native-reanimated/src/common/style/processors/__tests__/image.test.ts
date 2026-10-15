'use strict';
import { ERROR_MESSAGES, processObjectFit } from '../image';

describe(processObjectFit, () => {
  test.each([
    ['contain', 'contain'],
    ['cover', 'cover'],
    ['fill', 'stretch'],
    ['scale-down', 'contain'],
    ['none', 'none'],
  ])('maps %s to resizeMode %s', (objectFit, resizeMode) => {
    expect(processObjectFit(objectFit)).toEqual({ resizeMode });
  });

  test('throws an error for invalid objectFit', () => {
    expect(() => processObjectFit('invalid')).toThrow(
      new Error(
        `[Reanimated] ${ERROR_MESSAGES.unsupportedObjectFit('invalid')}`
      )
    );
  });
});
