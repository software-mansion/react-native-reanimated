'use strict';

import { withDelay, withSequence, withTiming } from '../../animation';
import type { LayoutAnimation } from '../../commonTypes';
import { ReduceMotion } from '../../commonTypes';
import { Easing } from '../../Easing';
import { nativeLayoutAnimationCallbackKey } from '../animationsManager';
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
  test('scopes callback identities to the surface', () => {
    expect(nativeLayoutAnimationCallbackKey(1, 42, 3)).not.toBe(
      nativeLayoutAnimationCallbackKey(2, 42, 3)
    );
  });

  test('lowers position and size into a full FLIP matrix track', () => {
    const compilation = compileNativeLayoutAnimation(
      {
        animations: {
          originX: withTiming(100, { duration: 100 }),
          originY: withTiming(200, { duration: 100 }),
          width: withTiming(200, { duration: 100 }),
          height: withTiming(100, { duration: 100 }),
        },
        initialValues: {
          originX: 10,
          originY: 20,
          width: 100,
          height: 50,
        },
      },
      undefined,
      { originX: 100, originY: 200, width: 200, height: 100 }
    );

    expect(compilation.status).toBe('native');
    if (compilation.status === 'native') {
      expect(compilation.plan.route).toBe('sampled');
      expect(compilation.plan.finalGeometry).toEqual({
        originX: 100,
        originY: 200,
        width: 200,
        height: 100,
      });
      expect(compilation.plan.tracks.map(({ target }) => target)).toEqual([
        'transform',
      ]);
      const segment = compilation.plan.tracks[0].segments[0];
      expect(segment.kind).toBe('keyframes');
      if (segment.kind === 'keyframes') {
        expect(segment.values[0]).toEqual([
          0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 1, 0, -140, -205, 0, 1,
        ]);
        expect(segment.values[segment.values.length - 1]).toEqual([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]);
      }
    }
  });

  test('routes ordered and duplicate style transforms as matrices', () => {
    const compilation = compileNativeLayoutAnimation(
      {
        animations: {
          transform: [
            { translateX: withTiming(100, { duration: 100 }) },
            { rotate: withTiming('90deg', { duration: 100 }) },
            { translateX: withTiming(20, { duration: 100 }) },
          ],
        },
        initialValues: {
          transform: [{ translateX: 0 }, { rotate: '0deg' }, { translateX: 0 }],
        },
      },
      undefined,
      { originX: 0, originY: 0, width: 100, height: 100 }
    );

    expect(compilation.status).toBe('native');
    if (compilation.status === 'native') {
      expect(compilation.plan.tracks[0].target).toBe('transform');
      expect(compilation.plan.reason).toBe('requires-sampling');
    }
  });

  test('falls back for a zero-sized final FLIP target', () => {
    const compilation = compileNativeLayoutAnimation(
      {
        animations: {
          width: withTiming(0, { duration: 100 }),
          height: withTiming(100, { duration: 100 }),
        },
        initialValues: { width: 100, height: 100 },
      },
      undefined,
      { originX: 0, originY: 0, width: 0, height: 100 }
    );

    expect(compilation).toEqual({
      status: 'fallback',
      reason: 'unsupported-value-type',
    });
  });

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

  test('completes reduced-motion graphs without a native animation plan', () => {
    const compilation = compileNativeLayoutAnimation({
      animations: {
        opacity: withTiming(1, {
          duration: 300,
          reduceMotion: ReduceMotion.Always,
        }),
      },
      initialValues: { opacity: 0 },
    });

    expect(compilation).toEqual({
      status: 'complete',
      reason: 'reduced-motion',
    });
  });

  test('completes zero-duration timing without a platform key', () => {
    const compilation = compileNativeLayoutAnimation({
      animations: {
        opacity: withTiming(1, {
          duration: 0,
        }),
      },
      initialValues: { opacity: 0 },
    });

    expect(compilation).toEqual({
      status: 'complete',
      reason: 'zero-duration',
    });
  });

  test('carries a resolved negative delay as an initial timeline offset', () => {
    const compilation = compileNativeLayoutAnimation({
      animations: {
        opacity: withDelay(
          -75,
          withTiming(1, { duration: 300, easing: Easing.linear })
        ),
      },
      initialValues: { opacity: 0 },
    });

    expect(compilation.status).toBe('native');
    if (compilation.status === 'native') {
      expect(compilation.plan.totalDurationMs).toBe(300);
      expect(compilation.plan.tracks[0]).toMatchObject({
        target: 'opacity',
        initialTimeOffsetMs: 75,
      });
    }
  });

  test('preserves cubic-bezier control points in timing IR', () => {
    const compilation = compileNativeLayoutAnimation({
      animations: {
        opacity: withTiming(1, {
          duration: 300,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
        }),
      },
      initialValues: { opacity: 0 },
    });

    expect(compilation.status).toBe('native');
    if (compilation.status === 'native') {
      expect(compilation.plan.route).toBe('simple');
      expect(compilation.plan.tracks[0].segments[0]).toMatchObject({
        kind: 'timing',
        easing: {
          kind: 'cubicBezier',
          controlPoints: [0.42, 0, 0.58, 1],
        },
      });
    }
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

  test('returns whole-animation fallback for unsupported properties', () => {
    expect(
      compileNativeLayoutAnimation({
        animations: { backgroundColor: withTiming(1) },
        initialValues: { backgroundColor: 0 },
      } as unknown as LayoutAnimation)
    ).toEqual({
      status: 'fallback',
      reason: 'unsupported-property',
    });
  });
});
