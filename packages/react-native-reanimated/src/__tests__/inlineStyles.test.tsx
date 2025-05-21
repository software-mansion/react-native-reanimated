import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, View } from 'react-native';

import Animated, {
  getAnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from '..';

jest.useFakeTimers();

describe('Tests of inline styles', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Inline styles', () => {
    function InlineStyle() {
      const width = useSharedValue(100);

      const handlePress = () => {
        width.value = width.value + 50;
      };

      return (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View
            testID="view"
            style={{
              width,
            }}
          />
          <Button testID="button" onPress={handlePress} title="Click me" />
        </View>
      );
    }

    render(<InlineStyle />);
    const view = screen.getByTestId('view');
    const button = screen.getByTestId('button');

    expect(getAnimatedStyle(view)).toEqual({ width: 100 });

    fireEvent.press(button);
    jest.runAllTimers();

    expect(view).toHaveAnimatedStyle({ width: 150 });

    const rendered = render(<InlineStyle />).toJSON();
    expect(rendered).toMatchSnapshot();
  });

  test('Inline styles with withTiming', () => {
    function InlineStyle() {
      const width = useSharedValue(100);

      const handlePress = () => {
        width.value = withTiming(width.value + 50, { duration: 500 });
      };

      return (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View
            testID="view"
            style={{
              width,
              height: 100,
              backgroundColor: 'violet',
            }}
          />
          <Button testID="button" onPress={handlePress} title="Click me" />
        </View>
      );
    }

    render(<InlineStyle />);
    const view = screen.getByTestId('view');
    const button = screen.getByTestId('button');

    expect(getAnimatedStyle(view)).toEqual({
      width: 100,
      height: 100,
      backgroundColor: 'violet',
    });

    fireEvent.press(button);

    jest.runAllTimers();

    expect(getAnimatedStyle(view)).toEqual({
      width: 150,
      height: 100,
      backgroundColor: 'violet',
    });

    const rendered = render(<InlineStyle />).toJSON();
    expect(rendered).toMatchSnapshot();
  });

  test('Double inline styles (single object)', () => {
    function UseAnimatedStyle() {
      const width = useSharedValue(100);
      const height = useSharedValue(100);

      const handlePress = () => {
        width.value = width.value + 50;
        height.value = height.value + 50;
      };

      return (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View testID="view" style={{ width, height }} />
          <Button testID="button" onPress={handlePress} title="Click me" />
        </View>
      );
    }

    render(<UseAnimatedStyle />);
    const view = screen.getByTestId('view');
    const button = screen.getByTestId('button');

    expect(getAnimatedStyle(view)).toEqual({ width: 100, height: 100 });

    fireEvent.press(button);

    jest.runAllTimers();

    expect(getAnimatedStyle(view)).toEqual({ width: 150, height: 150 });

    const rendered = render(<UseAnimatedStyle />).toJSON();
    expect(rendered).toMatchSnapshot();
  });

  test('Double inline styles (array)', () => {
    function UseAnimatedStyle() {
      const width = useSharedValue(100);
      const height = useSharedValue(100);

      const handlePress = () => {
        width.value = width.value + 50;
        height.value = height.value + 50;
      };

      return (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View testID="view" style={[{ width }, { height }]} />
          <Button testID="button" onPress={handlePress} title="Click me" />
        </View>
      );
    }

    render(<UseAnimatedStyle />);
    const view = screen.getByTestId('view');
    const button = screen.getByTestId('button');

    expect(getAnimatedStyle(view)).toEqual({ width: 100, height: 100 });

    fireEvent.press(button);

    jest.runAllTimers();

    expect(getAnimatedStyle(view)).toEqual({ width: 150, height: 150 });

    const rendered = render(<UseAnimatedStyle />).toJSON();
    expect(rendered).toMatchSnapshot();
  });

  test('Inline & useAnimatedStyle()', () => {
    function UseAnimatedStyle() {
      const width = useSharedValue(100);
      const height = useSharedValue(100);

      const handlePress = () => {
        width.value = width.value + 50;
        height.value = height.value + 50;
      };

      const animatedStyle = useAnimatedStyle(() => {
        return {
          width: width.value,
        };
      }, [width]);

      return (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View testID="view" style={[animatedStyle, { height }]} />
          <Button testID="button" onPress={handlePress} title="Click me" />
        </View>
      );
    }

    render(<UseAnimatedStyle />);
    const view = screen.getByTestId('view');
    const button = screen.getByTestId('button');

    expect(getAnimatedStyle(view)).toEqual({ width: 100, height: 100 });

    fireEvent.press(button);

    jest.runAllTimers();

    expect(getAnimatedStyle(view)).toEqual({ width: 150, height: 150 });

    const rendered = render(<UseAnimatedStyle />).toJSON();
    expect(rendered).toMatchSnapshot();
  });
});
