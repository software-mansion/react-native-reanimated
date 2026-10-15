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

  test.each(['invalid', 'toString'])(
    'throws an error for invalid objectFit %s',
    (value) => {
      expect(() => processObjectFit(value)).toThrow(
        new Error(`[Reanimated] ${ERROR_MESSAGES.unsupportedObjectFit(value)}`)
      );
    }
  );
});
