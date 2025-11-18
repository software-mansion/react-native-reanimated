'use strict';

import type { PlainStyle, StyleBuilder } from '../../../../../common';
import { getStyleBuilder } from '../../../registry';
import { normalizeAnimationKeyframes } from '../keyframes';

describe(normalizeAnimationKeyframes, () => {
  const styleBuilder = getStyleBuilder('RCTView');

  test('normalizes primitive properties', () => {
    const from = processValue(styleBuilder, 'backgroundColor', '#ff0000');
    const to = processValue(styleBuilder, 'backgroundColor', '#00ff00');

    const result = normalizeAnimationKeyframes(
      {
        from: { backgroundColor: '#ff0000' },
        to: { backgroundColor: '#00ff00' },
      },
      styleBuilder
    );

    expect(result.keyframesStyle.backgroundColor).toEqual([
      { offset: 0, value: from },
      { offset: 1, value: to },
    ]);
    expect(result.keyframeTimingFunctions).toEqual({});
  });

  test('orders offsets ascending', () => {
    const result = normalizeAnimationKeyframes(
      {
        to: { opacity: 1 },
        '50%': { opacity: 0.5 },
        from: { opacity: 0 },
      },
      styleBuilder
    );

    expect(result.keyframesStyle.opacity).toEqual([
      { offset: 0, value: 0 },
      { offset: 0.5, value: 0.5 },
      { offset: 1, value: 1 },
    ]);
  });

  test('normalizes transformOrigin into nested sequences', () => {
    const result = normalizeAnimationKeyframes(
      {
        from: { transformOrigin: '0 50% 0' },
        to: { transformOrigin: '100% 0 10px' },
      },
      styleBuilder
    );

    expect(result.keyframesStyle.transformOrigin).toEqual([
      [
        { offset: 0, value: 0 },
        { offset: 1, value: '100%' },
      ],
      [
        { offset: 0, value: '50%' },
        { offset: 1, value: 0 },
      ],
      [
        { offset: 0, value: 0 },
        { offset: 1, value: 10 },
      ],
    ]);
  });

  test('treats transform arrays as terminal values', () => {
    const from = processValue(styleBuilder, 'transform', [
      { scale: 0 },
      { rotate: '0deg' },
    ]);
    const to = processValue(styleBuilder, 'transform', [
      { scale: 1 },
      { rotate: '360deg' },
    ]);

    const result = normalizeAnimationKeyframes(
      {
        from: { transform: [{ scale: 0 }, { rotate: '0deg' }] },
        to: { transform: [{ scale: 1 }, { rotate: '360deg' }] },
      },
      styleBuilder
    );

    expect(result.keyframesStyle.transform).toEqual([
      { offset: 0, value: from },
      { offset: 1, value: to },
    ]);
  });

  test('normalizes filter values', () => {
    const from = processValue(
      styleBuilder,
      'filter',
      'blur(0px) brightness(0%)'
    );
    const to = processValue(
      styleBuilder,
      'filter',
      'blur(4px) brightness(100%)'
    );

    const result = normalizeAnimationKeyframes(
      {
        from: { filter: 'blur(0px) brightness(0%)' },
        to: { filter: 'blur(4px) brightness(100%)' },
      },
      styleBuilder
    );

    expect(result.keyframesStyle.filter).toEqual([
      { offset: 0, value: from },
      { offset: 1, value: to },
    ]);
  });

  test('normalizes boxShadow arrays', () => {
    const from = processValue(styleBuilder, 'boxShadow', '0px 0px 0px #000000');
    const to = processValue(
      styleBuilder,
      'boxShadow',
      '10px 5px 3px rgba(0,0,0,0.5)'
    );

    expect(Array.isArray(from)).toBe(true);
    expect(Array.isArray(to)).toBe(true);

    const result = normalizeAnimationKeyframes(
      {
        from: { boxShadow: '0px 0px 0px #000000' },
        to: { boxShadow: '10px 5px 3px rgba(0,0,0,0.5)' },
      },
      styleBuilder
    );

    const fromShadows = Array.isArray(from) ? from : [];
    const toShadows = Array.isArray(to) ? to : [];

    expect(result.keyframesStyle.boxShadow).toEqual(
      fromShadows.map((shadow, index) => [
        { offset: 0, value: shadow },
        { offset: 1, value: toShadows[index] },
      ])
    );
  });

  test('normalizes nested shadowOffset objects', () => {
    const from = processValue(styleBuilder, 'shadowOffset', {
      width: 0,
      height: 0,
    });
    const to = processValue(styleBuilder, 'shadowOffset', {
      width: 10,
      height: 5,
    });

    const result = normalizeAnimationKeyframes(
      {
        from: { shadowOffset: { width: 0, height: 0 } },
        to: { shadowOffset: { width: 10, height: 5 } },
      },
      styleBuilder
    );

    expect(result.keyframesStyle.shadowOffset).toEqual({
      width: [
        { offset: 0, value: from.width },
        { offset: 1, value: to.width },
      ],
      height: [
        { offset: 0, value: from.height },
        { offset: 1, value: to.height },
      ],
    });
  });
});

function processValue<P extends keyof PlainStyle>(
  builder: StyleBuilder,
  property: P,
  value: PlainStyle[P]
): NonNullable<PlainStyle[P]> {
  const processed = builder.buildFrom({
    [property]: value,
  } as Partial<PlainStyle>);

  if (!processed || processed[property] === undefined) {
    throw new Error(`Style builder did not process ${String(property)}`);
  }

  return processed[property] as NonNullable<PlainStyle[P]>;
}
