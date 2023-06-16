import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';

import React from 'react';

export default function TransformExample() {
  const [count, setCount] = React.useState(0);

  const ref = React.useRef(0);

  const sv = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${sv.value * 360}deg` },
        // { rotateY: `${sv.value * 360}deg` },
        { scaleX: 1 + sv.value },
        { scaleY: 1 / (1 + sv.value) },
        { perspective: 500 },
      ],
    };
  });

  const handleToggle = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 1500 });
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
      <View style={styles.buttons}>
        <Button onPress={handleToggle} title="Toggle shared value" />
        <Button onPress={handleIncrement} title="Increment counter" />
      </View>
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
  buttons: {
    marginTop: 50,
  },
});
