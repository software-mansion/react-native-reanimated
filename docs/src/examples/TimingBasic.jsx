import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

export default function App({width}) {
  const viewRef = useRef(null);

  const offset = useSharedValue(100);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  React.useEffect(() => {
    if (!viewRef.current) return;

    const rect = viewRef.current.getBoundingClientRect();

    offset.value = rect.width / 2 - 80;

    offset.value = withRepeat(
      // highlight-next-line
      withTiming(-offset.value, { duration: 1500 }),
      -1,
      true
    );
  }, [viewRef.current]);

  return (
    <View ref={viewRef} style={styles.container}>
      <Animated.View style={[styles.box, animatedStyles]} />
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
    height: 120,
    width: 120,
    backgroundColor: '#b58df1',
    borderRadius: 20,
  },
});
