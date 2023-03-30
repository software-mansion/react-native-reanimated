import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import React from 'react';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

Animated.addWhitelistedNativeProps({ r: true });

export default function SvgExample() {
  const sv = useSharedValue(0);

  sv.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);

  const animatedProps = useAnimatedProps(() => {
    return {
      r: `${1 + sv.value * 49}%`,
    };
  });

  return (
    <View style={styles.container}>
      <Svg height="200" width="200">
        <AnimatedCircle
          cx="50%"
          cy="50%"
          fill="lime"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
