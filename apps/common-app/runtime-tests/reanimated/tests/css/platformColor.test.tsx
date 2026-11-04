import { useEffect, useState } from 'react';
import { PlatformColor, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import {
  describe,
  render,
  test,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PLATFORM_BLUE = PlatformColor(
  'systemBlue',
  '@android:color/holo_blue_light'
);
const PLATFORM_GREEN = PlatformColor(
  'systemGreen',
  '@android:color/holo_green_light'
);

function PlatformColorExample() {
  const [toggled, setToggled] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setToggled(true), 100);
    return () => clearTimeout(id);
  }, []);

  return (
    <View>
      <Animated.View
        style={{
          animationDuration: '200ms',
          animationName: {
            from: { backgroundColor: PLATFORM_BLUE },
            to: { backgroundColor: 'red' },
          },
          height: 50,
          width: 50,
        }}
      />
      <Animated.View
        style={{
          backgroundColor: toggled ? PLATFORM_GREEN : 'red',
          height: 50,
          transitionDuration: '200ms',
          transitionProperty: 'backgroundColor',
          width: 50,
        }}
      />
      <Svg height={100} width={100}>
        <AnimatedCircle
          animatedProps={{
            animationDuration: '200ms',
            animationName: {
              from: { fill: PLATFORM_BLUE },
              to: { fill: 'red' },
            },
            stroke: toggled ? PLATFORM_GREEN : 'red',
            transitionDuration: '200ms',
            transitionProperty: 'stroke',
          }}
          cx={50}
          cy={50}
          r={40}
        />
      </Svg>
    </View>
  );
}

describe('CSS PlatformColor', () => {
  test('does not crash', async () => {
    await render(<PlatformColorExample />);
    await waitForFrames(60);
  });
});
