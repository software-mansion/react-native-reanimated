import React from 'react';
import { Button, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function App() {
  const r = useSharedValue(20);

  const handlePress = () => {
    r.value += 10;
  };

  // highlight-start
  const animatedProps = useAnimatedProps(() => ({
    r: withTiming(r.value),
  }));
  // highlight-end

  return (
    <View style={styles.container}>
      <Svg style={styles.svg}>
        <AnimatedCircle
          cx="50%"
          cy="50%"
          fill="#b58df1"
          // highlight-next-line
          animatedProps={animatedProps}
        />
      </Svg>
      <Button onPress={handlePress} title="Click me" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  svg: {
    height: 250,
    width: '100%',
  },
});
