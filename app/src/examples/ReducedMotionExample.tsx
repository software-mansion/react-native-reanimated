import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  useReducedMotion,
} from 'react-native-reanimated';

const duration = 2000;

export default function ReducedMotionExample() {
  const hookExample = useSharedValue(100);
  const shouldReduceMotion = useReducedMotion();

  const hookExampleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shouldReduceMotion ? 0 : hookExample.value }],
  }));

  React.useEffect(() => {
    hookExample.value = withRepeat(
      withTiming(-hookExample.value, {
        duration,
      }),
      -1,
      true
    );
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, hookExampleStyle]}>
        <Text style={styles.text}>useReducedMotion()</Text>
      </Animated.View>
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
  box: {
    height: 100,
    width: 150,
    margin: 20,
    borderWidth: 1,
    borderColor: '#b58df1',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#b58df1',
    fontWeight: 'bold',
  },
});
