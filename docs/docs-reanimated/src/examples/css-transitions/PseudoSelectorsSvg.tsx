import type React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { CircleProps } from 'react-native-svg';
import { Circle, Svg } from 'react-native-svg';

// react-native-svg accepts `style`, but its prop types don't declare it yet.
const AnimatedCircle = Animated.createAnimatedComponent(
  Circle
) as React.ComponentType<CircleProps & { style?: object }>;

const CIRCLES = [
  { cx: '20%', color: '#fa7f7c' },
  { cx: '50%', color: '#b58df1' },
  { cx: '80%', color: '#82cab2' },
];

export default function App() {
  return (
    <View style={styles.container}>
      <Svg style={styles.svg}>
        {CIRCLES.map(({ cx, color }) => (
          // Base geometry stays on the props so the circle renders at rest.
          <AnimatedCircle
            key={cx}
            cx={cx}
            cy="50%"
            r={28}
            fill={color}
            style={{
              // highlight-start
              fill: { default: color, ':hover': '#ffe780' },
              r: { default: 28, ':hover': 44 },
              // highlight-end
              transitionDuration: 400,
            }}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  svg: {
    height: 140,
    marginVertical: 48,
    width: '100%',
  },
});
