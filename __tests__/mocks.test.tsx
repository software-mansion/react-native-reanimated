import React from 'react';
import { render } from '@testing-library/react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  runOnUI,
  // @ts-expect-error Jest mocks are hard.
} from 'react-native-reanimated';

jest.mock('react-native-reanimated', () => {
  const originalModule = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...originalModule,
    ...require('../src/reanimated2/mock'),
  };
});

jest.spyOn(console, 'log');

describe('With Reanimated mocks', () => {
  it('library is mocked', () => {
    expect(FadeIn.isReanimatedMock()).toBe(true);
  });

  it('Animated components render', () => {
    const { getByTestId } = render(<Animated.View testID="views" />);
    expect(getByTestId('views')).toBeDefined();
  });

  it('Animated components with Layout Animations render', () => {
    const { getByTestId } = render(
      <Animated.View
        testID="view"
        entering={FadeIn.duration(500).damping(200).delay(1000)}
      />
    );
    expect(getByTestId('view')).toBeDefined();
  });

  it('Animated components with useAnimatedStyle render', () => {
    function TestComponent() {
      const style = useAnimatedStyle(() => {
        return {
          opacity: withTiming(1, { duration: 5000 }),
        };
      });
      return <Animated.View testID="view" style={style} />;
    }

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('view')).toBeDefined();
  });

  it('Animated components with useSharedValue render', () => {
    function TestComponent() {
      const opacity = useSharedValue(0);
      opacity.value = withTiming(1, { duration: 5000 });
      const style = useAnimatedStyle(() => {
        return {
          opacity: opacity.value,
        };
      });
      return <Animated.View testID="view" style={style} />;
    }

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('view')).toBeDefined();
  });

  it('you can `runOnJS`', () => {
    runOnJS(() => {
      console.log('runOnJS');
    })();
    expect(console.log).toHaveBeenCalled();
  });

  it('you can runOnUI', () => {
    runOnUI(() => {
      console.log('runOnUI');
    })();
    expect(console.log).toHaveBeenCalled();
  });
});
