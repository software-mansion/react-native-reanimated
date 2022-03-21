import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';

import React from 'react';

export default function UIPropsExample() {
  const [count, setCount] = React.useState(0);
  const state = React.useRef(0);

  const sv = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: 100 + sv.value * 50,
      backgroundColor: `hsl(${Math.round(sv.value * 240)}, 100%, 50%)`,
      transform: [
        { rotate: `${sv.value * 180}deg` },
        { rotateY: `${sv.value * 360}deg` },
        { scaleX: 1 + sv.value },
        { perspective: 500 },
      ],
    };
  });

  const handleToggle = () => {
    state.current = 1 - state.current;
    sv.value = withTiming(state.current, { duration: 2000 });
  };

  const handleIncrement = () => {
    setCount((c) => c + 1);
  };

  console.log('render');

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]}>
        <Text style={styles.text}>{count}</Text>
      </Animated.View>
      <View style={{ height: 40 }} />
      <Button onPress={handleToggle} title="Toggle shared value" />
      <Button onPress={handleIncrement} title="Increment" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 150,
    height: 150,
    backgroundColor: 'navy',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 80,
    color: 'white',
  },
});
