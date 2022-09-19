import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function OverlappingBoxesExample() {
  const sv = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    zIndex: sv.value,
    elevation: sv.value,
  }));

  const handlePress = () => {
    sv.value = sv.value === 1 ? 3 : 1;
  };

  return (
    <>
      <Animated.View style={[styles.first, style]} />
      <View style={styles.second} />
      <View style={styles.button}>
        <Button title="Toggle z-index &amp; elevation" onPress={handlePress} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  first: {
    position: 'absolute',
    top: 300,
    left: 50,
    width: 200,
    height: 200,
    backgroundColor: 'red',
  },
  second: {
    position: 'absolute',
    top: 400,
    left: 150,
    width: 200,
    height: 200,
    backgroundColor: 'blue',
    zIndex: 2,
    elevation: 2,
  },
  button: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
  },
});
