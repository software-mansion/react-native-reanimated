import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function NativePropsExample() {
  const [count, setCount] = React.useState(0);

  const handleToggle = () => {
    sv.value = withTiming(1 - sv.value, { duration: 2000 });
  };

  const handleIncrement = () => {
    console.log(sv.value);
    setCount((c) => c + 1);
  };

  console.log('render');

  const sv = useSharedValue(0);

  const animatedStyleBox = useAnimatedStyle(() => {
    return {
      width: 150 + sv.value * 150,
      height: 150 + (1 - sv.value) * 150,
      borderWidth: 10 + sv.value * 30,
      margin: sv.value * 100,
    };
  });

  const animatedStyleText = useAnimatedStyle(() => {
    return {
      fontSize: 20 + (1 - sv.value) * 40,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyleBox]}>
        <Animated.Text style={[styles.text, animatedStyleText]}>
          {count}
        </Animated.Text>
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
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'black',
    borderStyle: 'solid',
  },
  text: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'black',
  },
});
