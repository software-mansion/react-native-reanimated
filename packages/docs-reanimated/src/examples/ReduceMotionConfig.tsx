import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ReduceMotionConfig,
  ReduceMotion,
} from 'react-native-reanimated';

export default function App() {
  const sv = useSharedValue<number>(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sv.value}deg` }],
  }));

  useEffect(() => {
    sv.value = withRepeat(withTiming(360, { duration: 2000 }), -1, true);
  });

  return (
    <View style={styles.container}>
      {/* I'll uncomment if after merge of ReduceMotionConfig to main and new nightly release, because now component is unavailable */}
      {/* <ReduceMotionConfig mode={ReduceMotion.Never} /> */}
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
