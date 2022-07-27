import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

function makeColor(x: number) {
  'worklet';
  return `hsl(${Math.round(x * 240)}, 100%, 50%)`;
}

export default function ColorExample() {
  const ref = React.useRef(0);

  const sv = useSharedValue(0);

  const style1 = useAnimatedStyle(() => {
    return { backgroundColor: makeColor(sv.value) };
  });

  const style2 = useAnimatedStyle(() => {
    return { borderColor: makeColor(sv.value) };
  });

  const style3 = useAnimatedStyle(() => {
    return { color: makeColor(sv.value) };
  });

  const style4 = useAnimatedStyle(() => {
    return { shadowColor: makeColor(sv.value) };
  });

  // TODO: textDecorationColor, tintColor, textShadowColor, overlayColor

  const handleToggle = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 1500 });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box1, style1]} />
      <Animated.View style={[styles.box2, style2]} />
      <Animated.Text style={[styles.text3, style3]}>Reanimated</Animated.Text>
      <Animated.View style={[styles.box4, style4]} />
      <View style={styles.buttons}>
        <Button onPress={handleToggle} title="Toggle shared value" />
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
  box1: {
    width: 100,
    height: 100,
    backgroundColor: 'black',
    marginBottom: 20,
  },
  box2: {
    width: 100,
    height: 100,
    borderWidth: 10,
    borderColor: 'black',
    marginBottom: 20,
  },
  text3: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
  },
  box4: {
    width: 100,
    height: 100,
    backgroundColor: 'lightgray',
    shadowOffset: {
      width: 20,
      height: 20,
    },
    shadowRadius: 5,
    shadowOpacity: 1,
    shadowColor: 'black',
  },
  buttons: {
    marginTop: 50,
  },
});
