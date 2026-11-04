import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { describe, render, test, wait } from '../../../ReJest/RuntimeTestsApi';

// On Android a nested <Text> forms a view whose props are TextProps, not ViewProps.
// Layout animation code that treats them as ViewProps fails a debug assertion and aborts the app.

function AnimatedStyleNestedText() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 100 }), -1, true);
  }, [progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], ['red', 'blue']),
  }));
  return (
    <Text>
      outer <Animated.Text style={animatedStyle}>inner</Animated.Text>
    </Text>
  );
}

function ReactUpdatedNestedText() {
  const [color, setColor] = useState('red');
  useEffect(() => {
    const interval = setInterval(
      () => setColor((current) => (current === 'red' ? 'blue' : 'red')),
      50
    );
    return () => clearInterval(interval);
  }, []);
  return (
    <Text>
      outer <Animated.Text style={{ color }}>inner</Animated.Text>
    </Text>
  );
}

function EnteringNestedText() {
  return (
    <Text>
      outer <Animated.Text entering={FadeIn}>inner</Animated.Text>
    </Text>
  );
}

describe('Layout animations on a nested Text', () => {
  test('survive animated style updates', async () => {
    await render(<AnimatedStyleNestedText />);
    await wait(500);
  });

  test('survive React prop updates', async () => {
    await render(<ReactUpdatedNestedText />);
    await wait(500);
  });

  test('survive an entering animation', async () => {
    await render(<EnteringNestedText />);
    await wait(500);
  });
});
