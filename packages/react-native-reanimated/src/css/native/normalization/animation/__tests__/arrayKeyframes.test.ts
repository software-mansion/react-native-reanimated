'use strict';
import {
  getCompoundComponentName,
  registerComponentPropsBuilder,
} from '../../../../../common';
import type { CSSAnimationKeyframes } from '../../../../types';
import { normalizeAnimationKeyframes } from '../keyframes';

const component = getCompoundComponentName('RCTView', 'View');
const shadow = { offsetX: 10, offsetY: 8, color: 'red' };
const normalize = (keyframes: CSSAnimationKeyframes) =>
  normalizeAnimationKeyframes(keyframes, component).propKeyframes;

describe('array-valued keyframes', () => {
  test('custom nested-property registrations preserve arrays but still split records', () => {
    registerComponentPropsBuilder(
      'ArrayContainer',
      { values: true, offset: true },
      {
        separatelyInterpolatedNestedProperties: ['values', 'offset'],
      }
    );
    expect(
      normalizeAnimationKeyframes(
        {
          from: { values: [], offset: { width: 10 } },
          to: { values: [20], offset: { height: 30 } },
        } as CSSAnimationKeyframes,
        'ArrayContainer'
      ).propKeyframes
    ).toEqual({
      values: [
        { offset: 0, value: [] },
        { offset: 1, value: [20] },
      ],
      offset: {
        width: [{ offset: 0, value: 10 }],
        height: [{ offset: 1, value: 30 }],
      },
    });
  });

  test('boxShadow retains explicitly empty arrays at every offset', () => {
    expect(
      normalize({
        from: { boxShadow: [] },
        '50%': { boxShadow: [] },
        to: { boxShadow: [] },
      }).boxShadow
    ).toEqual([
      { offset: 0, value: [] },
      { offset: 0.5, value: [] },
      { offset: 1, value: [] },
    ]);
  });

  test('boxShadow keeps empty endpoints and unequal lists as whole values', () => {
    const result = normalize({
      from: { boxShadow: [] },
      '25%': { boxShadow: [shadow, { ...shadow, offsetX: -10 }] },
      '50%': { boxShadow: [] },
      '75%': { boxShadow: [shadow] },
      to: { boxShadow: [] },
    }).boxShadow;
    expect(result).toEqual([
      { offset: 0, value: [] },
      { offset: 0.25, value: [expect.any(Object), expect.any(Object)] },
      { offset: 0.5, value: [] },
      { offset: 0.75, value: [expect.any(Object)] },
      { offset: 1, value: [] },
    ]);
  });

  test('only omission and undefined leave boxShadow unspecified', () => {
    expect(
      normalize({
        from: { boxShadow: undefined },
        '25%': { opacity: 0.5 },
        '50%': { boxShadow: [] },
        to: { boxShadow: [shadow] },
      }).boxShadow
    ).toEqual([
      { offset: 0.5, value: [] },
      { offset: 1, value: [expect.any(Object)] },
    ]);
  });

  test.each(['boxShadow', 'transform'] as const)(
    '%s none normalizes to an explicitly empty array',
    (property) => {
      expect(normalize({ from: { [property]: 'none' } })[property]).toEqual([
        { offset: 0, value: [] },
      ]);
    }
  );

  test('transformOrigin remains a fixed tuple, not a variable-length list', () => {
    expect(normalize({ from: { transformOrigin: '10px 20px' } })).toEqual({
      transformOrigin: [{ offset: 0, value: [10, 20, 0] }],
    });
    expect(() => normalize({ from: { transformOrigin: [] as never } })).toThrow(
      'Expected 1-3 values'
    );
  });
});
