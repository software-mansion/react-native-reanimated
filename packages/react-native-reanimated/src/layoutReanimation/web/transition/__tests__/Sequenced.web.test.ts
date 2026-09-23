'use strict';
import type { TransitionData } from '../../animationParser';
import { SequencedTransition } from '../Sequenced';

// Both axes move, so a swapped scale component cannot look like a correct one.
const data: TransitionData = {
  translateX: 10,
  translateY: 20,
  scaleX: 2,
  scaleY: 0.5,
};

describe(SequencedTransition, () => {
  test('finishes the X axis and the width first', () => {
    const { style } = SequencedTransition('test', data);

    // Width is already final at the midpoint, height has not started yet.
    expect(style[50].transform[0].scale).toBe('1,0.5');
    // The translate values in the same keyframe make the same split.
    expect(style[50].transform[0].translateX).toBe('0px');
    expect(style[50].transform[0].translateY).toBe('20px');
  });

  test('finishes the Y axis and the height first when reversed', () => {
    const { style } = SequencedTransition('test', { ...data, reversed: true });

    // Height is already final at the midpoint, width has not started yet.
    expect(style[50].transform[0].scale).toBe('2,1');
    expect(style[50].transform[0].translateX).toBe('10px');
    expect(style[50].transform[0].translateY).toBe('0px');
  });

  test('starts at the initial ratios and ends at the identity transform', () => {
    const { style } = SequencedTransition('test', data);

    expect(style[0].transform[0].scale).toBe('2,0.5');
    expect(style[100].transform[0].scale).toBe('1,1');
  });
});
