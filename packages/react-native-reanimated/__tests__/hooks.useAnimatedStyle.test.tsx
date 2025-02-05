import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, View } from 'react-native';

import Animated, {
  getAnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from '../src';

jest.useFakeTimers();

describe('Tests of inline styles', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('useAnimatedStyle', () => {
    function UseAnimatedStyle() {
      const width = useSharedValue(100);

      const handlePress = () => {
        width.value = width.value + 50;
      };

      const animatedStyle = useAnimatedStyle(() => {
        return {
          width: width.value,
        };
      }, [width]);

      return (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View testID="view" style={animatedStyle} />
          <Button testID="button" onPress={handlePress} title="Click me" />
        </View>
      );
    }

    render(<UseAnimatedStyle />);
    const view = screen.getByTestId('view');
    const button = screen.getByTestId('button');

    expect(getAnimatedStyle(view)).toEqual({ width: 100 });

    fireEvent.press(button);

    jest.runAllTimers();

    expect(getAnimatedStyle(view)).toEqual({ width: 150 });
  });

  test('useAnimatedStyle with withTiming', () => {
    function UseAnimatedStyle() {
      const width = useSharedValue(100);

      const handlePress = () => {
        width.value = withTiming(width.value + 50, { duration: 500 });
      };

      const animatedStyle = useAnimatedStyle(() => {
        return {
          width: width.value,
        };
      }, [width]);

      return (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View testID="view" style={animatedStyle} />
          <Button testID="button" onPress={handlePress} title="Click me" />
        </View>
      );
    }

    render(<UseAnimatedStyle />);
    const view = screen.getByTestId('view');
    const button = screen.getByTestId('button');

    expect(getAnimatedStyle(view)).toEqual({ width: 100 });

    fireEvent.press(button);

    jest.runAllTimers();

    expect(getAnimatedStyle(view)).toEqual({ width: 150 });
  });
});
