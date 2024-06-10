import Animated, {
  Easing,
  FadeInLeft,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';
import React, { useEffect } from 'react';

export default function BasicNestedAnimation() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }),
      -1
    );
  }, [sv]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${sv.value * 360}deg` }],
    };
  });

  const [visible, setVisible] = React.useState(true);

  return (
    <View style={styles.container}>
      <Button onPress={() => setVisible(!visible)} title="Create/Remove" />
      {visible && (
        <Animated.View
          entering={FadeInLeft.duration(1500)}
          exiting={FadeOutRight.duration(1500)}
          style={styles.box1}>
          <Animated.View style={[styles.box2, animatedStyle]} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 300,
  },
  box1: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'lightgray',
  },
  box2: {
    width: 50,
    height: 50,
    backgroundColor: 'black',
  },
});
