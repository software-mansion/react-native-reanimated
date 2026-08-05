'use strict';
import { isPseudoSelectorValue } from '../guards';

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
