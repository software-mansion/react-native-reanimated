import { renderHook } from '@testing-library/react-native';

import { useAnimatedStyle } from '../src';
import type { StyleUpdaterContainer } from '../src/commonTypes';

function freezeEnumerableProperties(value: unknown): void {
  if (
    typeof value !== 'object' ||
    value === null ||
    Object.isFrozen(value) ||
    Object.isSealed(value)
  ) {
    return;
  }

  // Mirrors React Native's development-only native prop traversal.
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object);

  Object.freeze(object);
  keys.forEach((key) => freezeEnumerableProperties(object[key]));
}

describe('useAnimatedStyle with frozen style handles', () => {
  test('keeps its updater container mutable', () => {
    const { result } = renderHook(() => {
      const animatedStyle = useAnimatedStyle(() => ({ opacity: 1 }));

      freezeEnumerableProperties(animatedStyle);

      return animatedStyle;
    });

    const { styleUpdaterContainer } = result.current as unknown as {
      styleUpdaterContainer: StyleUpdaterContainer;
    };

    expect(Object.isFrozen(styleUpdaterContainer)).toBe(false);
    expect(styleUpdaterContainer.current).toBeDefined();
  });
});
