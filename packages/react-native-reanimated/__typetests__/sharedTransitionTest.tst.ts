import { describe, expect, test } from 'tstyche';

import type { SharedTransitionAnimationsValues } from '..';
import { SharedTransition, SharedTransitionType, withSpring } from '..';

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
