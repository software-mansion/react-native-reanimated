import { normalizeTransitionProperty } from './base';

describe(normalizeTransitionProperty, () => {
  it('returns "all" as is', () => {
    expect(normalizeTransitionProperty('all')).toBe('all');
  });

  it('returns array as is', () => {
    expect(normalizeTransitionProperty(['opacity', 'transform'])).toEqual([
      'opacity',
      'transform',
    ]);
  });

  it('converts single property to array', () => {
    expect(normalizeTransitionProperty('opacity')).toEqual(['opacity']);
  });

  it('returns empty array for "none"', () => {
    expect(normalizeTransitionProperty('none')).toEqual([]);
  });
});
