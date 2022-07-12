import { StyleSheet, View, Button } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function CoreAnimationSpringExample() {
  const sv = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: sv.value }],
    };
  });

  const handlePress = () => {
    sv.value = withSpring(100, {}, () => {
      sv.value = withSpring(0);
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Button title="Animate" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 150,
    height: 150,
    marginVertical: 30,
    backgroundColor: 'navy',
  },
});
