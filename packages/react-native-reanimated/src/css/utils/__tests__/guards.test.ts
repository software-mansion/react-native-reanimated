'use strict';
import {
  CSS_CALLBACK_PROPS,
  hasCSSCallbackProp,
  isPseudoSelectorValue,
} from '../guards';

describe(isPseudoSelectorValue, () => {
  test.each([
    [{ default: 'a' }, true],
    [{ ':hover': 'a' }, true],
    [{ default: 'a', ':hover': 'b' }, true],
    [{ ':nth-child(odd)': 'a' }, true],
    [{ ':focus-visible': 'a', default: 'b' }, true],
    [{}, false],
    [{ width: 1 }, false],
    [{ default: 'a', width: 1 }, false],
    [null, false],
    [undefined, false],
    [42, false],
    ['hover', false],
    [[1, 2], false],
  ])('isPseudoSelectorValue(%p) === %p', (input, expected) => {
    expect(isPseudoSelectorValue(input)).toBe(expected);
  });
});

describe(hasCSSCallbackProp, () => {
  // The check spells the names out for speed, so it can drift from the list.
  test.each(CSS_CALLBACK_PROPS)('detects %s', (prop) => {
    expect(hasCSSCallbackProp({ [prop]: jest.fn() })).toBe(true);
  });

  test('ignores a view with no callbacks', () => {
    expect(hasCSSCallbackProp({ opacity: 1, onPress: jest.fn() })).toBe(false);
  });
});
