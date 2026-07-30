'use strict';

import { withDelay, withSequence, withTiming } from '../../animation';
import type { LayoutAnimation } from '../../commonTypes';
import { Easing } from '../../Easing';
import { SlideInLeft } from '../defaultAnimations/Slide';
import {
  buildNativeLayoutAnimationDescriptor,
  compileNativeLayoutAnimation,
} from '../nativeAnimationDescriptor';

describe('native layout animation descriptor', () => {
  test('samples SlideInLeft and adds its target opacity', () => {
    const style = SlideInLeft.duration(100).build()({
      targetOriginX: 100,
      targetGlobalOriginX: 100,
      targetOriginY: 200,
      targetGlobalOriginY: 200,
      targetWidth: 50,
      targetHeight: 50,
      targetBorderRadius: 0,
      windowWidth: 400,
      windowHeight: 800,
    });

    const descriptor = buildNativeLayoutAnimationDescriptor(style, 0.4);

    expect(descriptor.properties.map((property) => property.keyPath)).toEqual([
      'originX',
      'opacity',
    ]);
  });

  test('adds the target opacity to a geometry-only entering animation', () => {
    const descriptor = buildNativeLayoutAnimationDescriptor(
      {
        animations: {
          originX: withTiming(100, { duration: 100 }),
        },
        initialValues: {
          originX: 0,
        },
      },
      0.4
    );

    expect(
      descriptor.properties.find((property) => property.keyPath === 'opacity')
    ).toEqual({
      keyPath: 'opacity',
      offsets: [0, 1],
      values: [0.4, 0.4],
    });
  });

  test('keeps an explicit opacity animation unchanged', () => {
    const descriptor = buildNativeLayoutAnimationDescriptor(
      {
        animations: {
          opacity: withTiming(1, { duration: 100 }),
        },
        initialValues: {
          opacity: 0,
        },
      },
      0.4
    );

    const opacity = descriptor.properties.find(
      (property) => property.keyPath === 'opacity'
    );
    expect(opacity?.values[0]).toBe(0);
    expect(opacity?.values[opacity.values.length - 1]).toBe(1);
  });
});

describe('native layout animation structural compiler', () => {
  test('lowers linear timing without sampled keyframes', () => {
    const compilation = compileNativeLayoutAnimation({
      animations: {
        opacity: withTiming(1, { duration: 240, easing: Easing.linear }),
      },
      initialValues: { opacity: 0 },
    });

    expect(compilation).toEqual({
      status: 'native',
      reason: 'canonical-single-timing',
      plan: {
        totalDurationMs: 240,
        route: 'simple',
        reason: 'canonical-single-timing',
        tracks: [
          {
            target: 'opacity',
            segments: [
              {
                kind: 'timing',
                startMs: 0,
                endMs: 240,
                from: 0,
                to: 1,
                easing: { kind: 'linear' },
              },
            ],
          },
        ],
      },
    });
  });

  test('lowers delay and sequence to ordered sparse segments', () => {
    const compilation = compileNativeLayoutAnimation({
      animations: {
        opacity: withDelay(
          40,
          withSequence(
            withTiming(0.5, { duration: 60, easing: Easing.linear }),
            withTiming(1, { duration: 100, easing: Easing.linear })
          )
        ),
      },
      initialValues: { opacity: 0 },
    });

    expect(compilation.status).toBe('native');
    if (compilation.status !== 'native') {
      return;
    }
    expect(compilation.plan.route).toBe('structured');
    expect(compilation.plan.reason).toBe('contains-hold-or-sequence');
    expect(compilation.plan.totalDurationMs).toBe(200);
    expect(compilation.plan.tracks[0].segments).toMatchObject([
      { kind: 'hold', startMs: 0, endMs: 40, value: 0 },
      { kind: 'timing', startMs: 40, endMs: 100, from: 0, to: 0.5 },
      { kind: 'timing', startMs: 100, endMs: 200, from: 0.5, to: 1 },
    ]);
  });

  test('uses an explicit sampled route for opaque easing', () => {
    const compilation = compileNativeLayoutAnimation({
      animations: {
        opacity: withTiming(1, { duration: 100 }),
      },
      initialValues: { opacity: 0 },
    });

    expect(compilation.status).toBe('native');
    if (compilation.status === 'native') {
      expect(compilation.plan.route).toBe('sampled');
      expect(compilation.reason).toBe('requires-sampling');
    }
  });

  test.each([
    [
      {
        animations: { backgroundColor: withTiming(1) },
        initialValues: { backgroundColor: 0 },
      },
      'unsupported-property',
    ],
    [
      {
        animations: {
          transform: [
            { rotate: withTiming('90deg') },
            { translateX: withTiming(20) },
          ],
        },
        initialValues: {
          transform: [{ rotate: '0deg' }, { translateX: 0 }],
        },
      },
      'transform-ordering-unavailable',
    ],
  ] as const)(
    'returns whole-animation fallback with reason',
    (style, reason) => {
      expect(
        compileNativeLayoutAnimation(style as unknown as LayoutAnimation)
      ).toEqual({
        status: 'fallback',
        reason,
      });
    }
  );
});
