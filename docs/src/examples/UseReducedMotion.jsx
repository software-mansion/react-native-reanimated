import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function App() {
  const sv = useSharedValue(-200);
  // highlight-start
  const shouldReduceMotion = useReducedMotion();
  // highlight-end

  const animatedStyle = useAnimatedStyle(() => ({
    // highlight-start
    transform: [{ translateX: shouldReduceMotion ? 0 : sv.value }],
    // highlight-end
  }));

  React.useEffect(() => {
    sv.value = withRepeat(withTiming(200, { duration: 2000 }), -1, true);
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
});
