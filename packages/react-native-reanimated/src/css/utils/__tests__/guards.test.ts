'use strict';
import { isPseudoSelectorValue, resolvePseudoKeyed } from '../guards';

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

describe(resolvePseudoKeyed, () => {
  test('returns the value as-is when it is not a pseudo-keyed object', () => {
    expect(resolvePseudoKeyed('150ms')).toBe('150ms');
    expect(resolvePseudoKeyed(150)).toBe(150);
    expect(resolvePseudoKeyed(['150ms', '300ms'])).toEqual(['150ms', '300ms']);
    expect(resolvePseudoKeyed(undefined)).toBe(undefined);
  });

  test('picks the default branch when no selector is specified', () => {
    const value = { default: '150ms', ':hover': '300ms', ':active': '60ms' };
    expect(resolvePseudoKeyed(value)).toBe('150ms');
  });

  test('picks the requested selector branch', () => {
    const value = { default: '150ms', ':hover': '300ms', ':active': '60ms' };
    expect(resolvePseudoKeyed(value, ':hover')).toBe('300ms');
    expect(resolvePseudoKeyed(value, ':active')).toBe('60ms');
  });

  test('falls back to default when the requested selector is not present', () => {
    const value = { default: '150ms', ':hover': '300ms' };
    expect(resolvePseudoKeyed(value, ':focus')).toBe('150ms');
  });

  test('returns undefined when neither the requested selector nor default are present', () => {
    const value = { ':hover': '300ms' };
    expect(resolvePseudoKeyed(value, ':focus')).toBe(undefined);
  });

  test('resolves arbitrary :-prefixed selectors', () => {
    const value = { default: '150ms', ':nth-child(odd)': '500ms' };
    expect(resolvePseudoKeyed(value, ':nth-child(odd)')).toBe('500ms');
    expect(resolvePseudoKeyed(value, ':first-child')).toBe('150ms');
  });

  test('preserves array values per selector', () => {
    const value = {
      default: ['150ms', '300ms'],
      ':hover': ['60ms', '120ms'],
    };
    expect(resolvePseudoKeyed(value, ':hover')).toEqual(['60ms', '120ms']);
    expect(resolvePseudoKeyed(value)).toEqual(['150ms', '300ms']);
  });
});
