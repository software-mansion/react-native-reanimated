'use strict';
import { ERROR_MESSAGES, processVerticalAlign } from '../text';

describe(processVerticalAlign, () => {
  test.each([
    ['auto', 'auto'],
    ['top', 'top'],
    ['bottom', 'bottom'],
    ['middle', 'center'],
  ])('maps %s to textAlignVertical %s', (verticalAlign, textAlignVertical) => {
    expect(processVerticalAlign(verticalAlign)).toEqual({ textAlignVertical });
  });

  test.each(['invalid', 'toString'])(
    'throws an error for invalid verticalAlign %s',
    (value) => {
      expect(() => processVerticalAlign(value)).toThrow(
        new Error(
          `[Reanimated] ${ERROR_MESSAGES.unsupportedVerticalAlign(value)}`
        )
      );
    }
  );
});
