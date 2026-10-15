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

  test('throws an error for invalid verticalAlign', () => {
    expect(() => processVerticalAlign('invalid')).toThrow(
      new Error(
        `[Reanimated] ${ERROR_MESSAGES.unsupportedVerticalAlign('invalid')}`
      )
    );
  });
});
