import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function App() {
  // highlight-start
  const r = useSharedValue(20);

  useEffect(() => {
    const easing = Easing.bezier(0.25, 0.1, 0.25, 1); // CSS `ease`
    r.value = withRepeat(withTiming(50, { duration: 1000, easing }), -1, true);
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    r: r.value,
  }));
  // highlight-end

  return (
    <View style={styles.container}>
      <Svg style={styles.svg}>
        {/* Pass the animated props to your animated component */}
        {/* highlight-start */}
        <AnimatedCircle
          cx="50%"
          cy="50%"
          fill="#b58df1"
          animatedProps={animatedProps}
        />
        {/* highlight-end */}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: { height: 100, width: '100%' },
});
