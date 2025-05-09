import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function EmptyExample() {
  const sv = useSharedValue(0);
  const [height, setHeight] = useState(50);

  useEffect(() => {
    sv.value = withRepeat(withTiming(100, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: sv.value,
    };
  });

  return (
    <View style={styles.container}>
      <Button
        onPress={() => setHeight((prev) => prev + 10)}
        title="Toggle Height"
      />
      <Animated.View
        style={[
          {
            backgroundColor: 'blue',
            height,
            width: 100,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
