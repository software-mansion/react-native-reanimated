import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ReducedMotionConfig,
  ReduceMotion,
} from 'react-native-reanimated';
import { SelectOption } from '@site/src/components/InteractivePlayground';

type Mode = keyof typeof ReduceMotion;

export default function App() {
  const [mode, setMode] = useState<Mode>('System');
  const sv = useSharedValue<number>(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sv.value}deg` }],
  }));

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(360, { duration: 2000 }), -1, true);
  }, [mode]);

  return (
    <View style={styles.container}>
      <SelectOption
        label="Mode"
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        options={Object.keys(ReduceMotion)}
      />
      <ReducedMotionConfig mode={ReduceMotion[mode]} />
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 20,
  },
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
  },
});
