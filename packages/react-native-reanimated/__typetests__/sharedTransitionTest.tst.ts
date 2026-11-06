import { describe, expect, test } from 'tstyche';

import type {
  CustomSharedTransitionAnimation,
  SharedTransitionAnimationsValues,
} from '..';
import {
  SharedTransition,
  SharedTransitionType,
  withSpring,
  withTiming,
} from '..';

describe('SharedTransition', () => {
  test('custom animation receives typed source and target values', () => {
    SharedTransition.custom((values) => {
      'worklet';
      expect(values.targetWidth).type.toBe<number>();
      expect(values.currentTransform.matrix).type.toBe<number[]>();
      expect(values.targetBorderTopLeftRadius).type.toBe<
        number | string | undefined
      >();
      expect(values.windowHeight).type.toBe<number>();
      return { width: withSpring(values.targetWidth) };
    });
  });

  test('values reject unknown properties', () => {
    expect<SharedTransitionAnimationsValues>().type.not.toHaveProperty(
      'targetMargin'
    );
  });

  test('custom transforms accept a single matrix and the legacy alias', () => {
    SharedTransition.custom((values) => ({
      transform: [{ matrix: withTiming(values.targetTransform.matrix) }],
    }));
    SharedTransition.custom((values) => ({
      transformMatrix: withSpring(values.targetTransformMatrix),
    }));
  });

  test('custom transforms reject individual operations and multiple matrices', () => {
    expect(() => ({
      transform: [{ scale: withTiming(2) }],
    })).type.not.toBeAssignableTo<CustomSharedTransitionAnimation>();
    expect(() => ({
      transform: [{ rotate: '90deg' }],
    })).type.not.toBeAssignableTo<CustomSharedTransitionAnimation>();
    expect(() => ({
      transform: [{ matrix: [] }, { matrix: [] }],
    })).type.not.toBeAssignableTo<CustomSharedTransitionAnimation>();
  });

  test('progress callbacks can compute individual transform operations', () => {
    SharedTransition.progressAnimation((_values, progress) => ({
      transform: [{ scale: progress }],
    }));
  });

  test('builders stay SharedTransition through static and chained modifiers', () => {
    expect(
      SharedTransition.progressAnimation((values, progress) => {
        'worklet';
        return { width: values.currentWidth + progress };
      })
    ).type.toBe<SharedTransition>();
    expect(
      SharedTransition.custom(() => {
        'worklet';
        return {};
      })
        .duration(300)
        .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION)
    ).type.toBe<SharedTransition>();
    expect(
      SharedTransition.defaultTransitionType(SharedTransitionType.ANIMATION)
    ).type.toBe<SharedTransition>();
  });
});
