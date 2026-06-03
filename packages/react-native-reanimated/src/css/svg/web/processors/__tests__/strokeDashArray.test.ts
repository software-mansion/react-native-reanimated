'use strict';
import {
  processStrokeDashArray,
  withImplicitStrokeDashArrayBounds,
} from '../strokeDashArray';

describe(processStrokeDashArray, () => {
  test('adds px to a numeric scalar', () => {
    expect(processStrokeDashArray(10)).toBe('10px');
  });

  test('keeps an existing percentage unit', () => {
    expect(processStrokeDashArray('10%')).toBe('10%');
  });

  test('applies the unit per element for a numeric array', () => {
    expect(processStrokeDashArray([10, 20, 30])).toBe('10px 20px 30px');
  });

  test('keeps percentages in an array', () => {
    expect(processStrokeDashArray(['10%', '5%'])).toBe('10% 5%');
  });

  test('handles a mixed array', () => {
    expect(processStrokeDashArray([8, '15%'])).toBe('8px 15%');
  });
});

describe(withImplicitStrokeDashArrayBounds, () => {
  test('injects the first array element as the start for a to-only value', () => {
    expect(
      withImplicitStrokeDashArrayBounds({
        to: { strokeDasharray: [10, 20, 30] },
      })
    ).toEqual({
      from: { strokeDasharray: 10 },
      to: { strokeDasharray: [10, 20, 30] },
    });
  });

  test('injects the first array element as the end for a from-only value', () => {
    expect(
      withImplicitStrokeDashArrayBounds({
        from: { strokeDasharray: [10, 20, 30] },
      })
    ).toEqual({
      from: { strokeDasharray: [10, 20, 30] },
      to: { strokeDasharray: 10 },
    });
  });

  test('seeds both ends when only intermediate offsets are defined', () => {
    expect(
      withImplicitStrokeDashArrayBounds({
        '20%': { strokeDasharray: [10, 20] },
        '80%': { strokeDasharray: [30, 40] },
      })
    ).toEqual({
      from: { strokeDasharray: 10 },
      '20%': { strokeDasharray: [10, 20] },
      '80%': { strokeDasharray: [30, 40] },
      to: { strokeDasharray: 30 },
    });
  });

  test('picks the true extremes among several intermediate frames', () => {
    // The middle frame is neither extreme, so the seeds come from 25%/75%, not 50%.
    expect(
      withImplicitStrokeDashArrayBounds({
        '25%': { strokeDasharray: [10, 20] },
        '50%': { strokeDasharray: [1, 2] },
        '75%': { strokeDasharray: [30, 40] },
      })
    ).toEqual({
      from: { strokeDasharray: 10 },
      '25%': { strokeDasharray: [10, 20] },
      '50%': { strokeDasharray: [1, 2] },
      '75%': { strokeDasharray: [30, 40] },
      to: { strokeDasharray: 30 },
    });
  });

  test('merges the seed into an existing endpoint keyframe', () => {
    expect(
      withImplicitStrokeDashArrayBounds({
        from: { opacity: 1 },
        '50%': { strokeDasharray: [10, 20] },
      })
    ).toEqual({
      from: { opacity: 1, strokeDasharray: 10 },
      '50%': { strokeDasharray: [10, 20] },
      to: { strokeDasharray: 10 },
    });
  });

  test('uses the scalar itself for a to-only scalar (stays static)', () => {
    expect(
      withImplicitStrokeDashArrayBounds({ to: { strokeDasharray: 10 } })
    ).toEqual({ from: { strokeDasharray: 10 }, to: { strokeDasharray: 10 } });
  });

  test('uses the first element of a percentage array', () => {
    expect(
      withImplicitStrokeDashArrayBounds({
        to: { strokeDasharray: ['10%', '5%'] },
      })
    ).toEqual({
      from: { strokeDasharray: '10%' },
      to: { strokeDasharray: ['10%', '5%'] },
    });
  });

  test('keeps a fully bounded animation untouched', () => {
    const defs = {
      from: { strokeDasharray: [5, 5] },
      to: { strokeDasharray: [10, 20, 30] },
    };
    expect(withImplicitStrokeDashArrayBounds(defs)).toBe(defs);
  });

  test('ignores keyframes without strokeDasharray', () => {
    const defs = { to: { opacity: 0 } };
    expect(withImplicitStrokeDashArrayBounds(defs)).toBe(defs);
  });
});
