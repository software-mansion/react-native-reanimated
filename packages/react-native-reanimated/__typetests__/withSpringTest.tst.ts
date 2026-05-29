/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, expect, test } from 'tstyche';

import { useAnimatedStyle, withSpring } from '..';

describe('withSpring', () => {
  test('animates backgroundColor with a color string toValue', () => {
    expect(useAnimatedStyle).type.toBeCallableWith(() => ({
      backgroundColor: withSpring('rgba(255,105,180,0)', {}, (_finished) => {}),
    }));
  });
});
