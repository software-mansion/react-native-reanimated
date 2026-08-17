'use strict';
import { withMatchingPathStructure } from '../pathStructure';

describe(withMatchingPathStructure, () => {
  test('pads a trailing Z when command sequences otherwise match', () => {
    expect(
      withMatchingPathStructure({
        from: { d: 'M0,0 L10,10' },
        to: { d: 'M0,0 L20,5 Z' },
      })
    ).toEqual({ from: { d: 'M0,0 L10,10Z' }, to: { d: 'M0,0 L20,5 Z' } });
  });

  test('leaves genuinely different structures unchanged', () => {
    const defs = { from: { d: 'M0,0 L10,10 Z' }, to: { d: 'M0,0 Z' } };
    expect(withMatchingPathStructure(defs)).toBe(defs);
  });

  test('leaves consistently closed paths unchanged', () => {
    const defs = {
      from: { d: 'M0,0 L10,10 Z' },
      to: { d: 'M0,0 L20,5 Z' },
    };
    expect(withMatchingPathStructure(defs)).toBe(defs);
  });

  test('leaves consistently open paths unchanged', () => {
    // Same structure, both open: they already interpolate, so closing both
    // would change the shapes for nothing.
    const defs = { from: { d: 'M0,0 L10,10' }, to: { d: 'M0,0 L20,5' } };
    expect(withMatchingPathStructure(defs)).toBe(defs);
  });

  test('leaves a single path unchanged', () => {
    const defs = { to: { d: 'M0,0 L10,10' } };
    expect(withMatchingPathStructure(defs)).toBe(defs);
  });

  // The boundary frame keeps the left value at its offset and gets a fake frame a
  // bit later carrying the right value, so the closepath flips as a discrete step.
  test.each([
    [
      'splits an open->closed boundary (closes the right side)',
      {
        '0%': { d: 'M0,0 L10,10' },
        '50%': { d: 'M0,0 L5,5' },
        '100%': { d: 'M0,0 L20,5 Z' },
      },
      {
        '0%': { d: 'M0,0 L10,10' },
        '50%': { d: 'M0,0 L5,5' },
        '50.001%': { d: 'M0,0 L5,5Z' },
        '100%': { d: 'M0,0 L20,5 Z' },
      },
    ],
    [
      'splits a closed->open boundary (closes the left side)',
      {
        from: { d: 'M0,0 L10,10 Z' },
        '50%': { d: 'M0,0 L5,5' },
        to: { d: 'M0,0 L20,5' },
      },
      {
        from: { d: 'M0,0 L10,10 Z' },
        '50%': { d: 'M0,0 L5,5Z' },
        '50.001%': { d: 'M0,0 L5,5' },
        to: { d: 'M0,0 L20,5' },
      },
    ],
  ])('%s', (_name, input, expected) => {
    expect(withMatchingPathStructure(input)).toEqual(expected);
  });

  test('closes a lone open frame between closed frames without a fake frame', () => {
    // closed -> open -> closed: both segments are closed, so the middle frame is
    // just closed in place (no boundary split needed).
    expect(
      withMatchingPathStructure({
        from: { d: 'M0,0 L10,10 Z' },
        '50%': { d: 'M0,0 L5,5' },
        to: { d: 'M0,0 L20,5 Z' },
      })
    ).toEqual({
      from: { d: 'M0,0 L10,10 Z' },
      '50%': { d: 'M0,0 L5,5Z' },
      to: { d: 'M0,0 L20,5 Z' },
    });
  });

  test('ignores keyframes without a `d`', () => {
    const defs = { to: { opacity: 0 } };
    expect(withMatchingPathStructure(defs)).toBe(defs);
  });
});
