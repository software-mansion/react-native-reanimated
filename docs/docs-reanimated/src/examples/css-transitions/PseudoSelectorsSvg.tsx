import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
          // `default` inside each pseudo object is the resting value, so the
          // plain `r` and `fill` props below are optional here.
          <AnimatedCircle
            key={cx}
            cx={cx}
            cy="50%"
            r={28}
            fill={color}
            animatedProps={{
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
