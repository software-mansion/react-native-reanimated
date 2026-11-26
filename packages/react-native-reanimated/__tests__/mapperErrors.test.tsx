import { renderHook } from '@testing-library/react-native';

import { useAnimatedReaction, useDerivedValue, useSharedValue } from '../src';

const MAPPER_ERROR = 'error thrown by a mapper';
const THROWING_VALUE = 1;

describe('errors thrown by mappers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs the dirty mappers that follow a mapper that throws', () => {
    const { result } = renderHook(() => {
      const source = useSharedValue(0);
      const copy = useDerivedValue(() => source.value);
      useAnimatedReaction(
        () => copy.value,
        (current) => {
          if (current === THROWING_VALUE) {
            throw new Error('[Reanimated] error thrown by a mapper');
          }
        }
      );
      const derived = useDerivedValue(() => copy.value * 2);
      return { source, derived };
    });
    jest.advanceTimersByTime(100);
    expect(result.current.derived.value).toBe(0);

    expect(() => {
      result.current.source.value = THROWING_VALUE;
    }).toThrow(MAPPER_ERROR);

    expect(result.current.derived.value).toBe(THROWING_VALUE * 2);
  });
});
