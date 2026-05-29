import { describe, expect, test } from 'tstyche';

import { withSpring } from '..';

describe('withSpring', () => {
  test('animates a color string toValue to a string result', () => {
    expect(
      withSpring('rgba(255,105,180,0)', {})
    ).type.toBeAssignableTo<string>();
  });

  test('accepts an animation callback', () => {
    expect(withSpring).type.toBeCallableWith(
      'rgba(255,105,180,0)',
      {},
      (_finished?: boolean) => undefined
    );
  });
});
