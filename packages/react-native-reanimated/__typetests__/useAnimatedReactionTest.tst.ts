import { describe, expect, test } from 'tstyche';

import { useAnimatedReaction, useSharedValue } from '..';

describe('useAnimatedReaction', () => {
  test('accepts a prepare and a react function', () => {
    const sv = useSharedValue(0);
    expect(useAnimatedReaction).type.toBeCallableWith(
      () => sv.value,
      (value: number) => {
        console.log(value);
      }
    );
  });

  test('accepts an optional dependency array', () => {
    const sv = useSharedValue(0);
    expect(useAnimatedReaction).type.toBeCallableWith(
      () => sv.value,
      (value: number) => {
        console.log(value);
      },
      []
    );
  });

  test('react receives the previous result', () => {
    const sv = useSharedValue(0);
    expect(useAnimatedReaction).type.toBeCallableWith(
      () => sv.value,
      (value: number, previousResult: number | null) => {
        console.log(value, previousResult);
      }
    );
  });
});
