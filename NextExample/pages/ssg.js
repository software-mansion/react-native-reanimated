import Animated, {
  PinwheelIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, View, Text } from 'react-native';

import { useEffect } from 'react';

export default function App() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1), -1, true);
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: sv.value * 200 + 10,
    };
  });

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.text}>
        This page was statically generated during build
      </Text>

      <Animated.View
        entering={PinwheelIn}
        style={[styles.box, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    height: 100,
    backgroundColor: '#b58df1',
    borderRadius: 10,
  },
  text: {
    alignItems: 'center',
    fontSize: 40,
    marginBottom: 24,
  },
});
