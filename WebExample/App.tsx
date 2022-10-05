import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

export default function App() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1), -1, true);
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: 100 + sv.value * 100,
      height: 200 - sv.value * 100,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: 'black',
  },
});
