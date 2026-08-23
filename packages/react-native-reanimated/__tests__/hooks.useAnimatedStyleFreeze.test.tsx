import { render } from '@testing-library/react-native';

import { useAnimatedStyle } from '../src';

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
    function FreezeAnimatedStyleHandle() {
      const animatedStyle = useAnimatedStyle(() => ({ opacity: 1 }));

      freezeEnumerableProperties(animatedStyle);

      return null;
    }

    expect(() => render(<FreezeAnimatedStyleHandle />)).not.toThrow();
  });
});
