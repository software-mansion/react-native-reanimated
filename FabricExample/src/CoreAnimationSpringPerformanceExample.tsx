import { StyleSheet, View, Button } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  withSpring,
  withSpringCoreAnimation,
} from 'react-native-reanimated';

const N = 1500;

export default function CoreAnimationSpringPerformanceExample() {
  const svs = new Array(N);

  for (let i = 0; i < N; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    svs[i] = useSharedValue(i);
  }

  const handlePress = () => {
    for (let i = 0; i < N; i++) {
      // svs[i].value = withSpring(150);
      svs[i].value = withSpringCoreAnimation(150);
    }
    console.log('OK');
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: svs[42].value }],
    };
  });

  return (
    <View style={styles.container}>
      <Button title="Animate" onPress={handlePress} />
      <Animated.View style={[styles.box, animatedStyle]} />
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
    width: 100,
    height: 100,
    backgroundColor: 'lime',
  },
});
