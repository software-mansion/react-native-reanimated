import { StyleSheet, View, Button } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function CoreAnimationSpringExample() {
  const sv1 = useSharedValue(0);
  const sv2 = useSharedValue(0);
  const sv3 = useSharedValue(0);

  const ref = React.useRef(1);

  const animatedStyle1 = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: sv1.value }],
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: sv2.value }],
    };
  });

  const animatedStyle3 = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: sv3.value }],
    };
  });

  const handlePress = () => {
    sv1.value = withSpring(ref.current * 60);
    sv2.value = withSpring(ref.current * 80);
    sv3.value = withSpring(ref.current * 100);
    ref.current = -ref.current;
  };

  return (
    <View style={styles.container}>
      <Button title="Animate" onPress={handlePress} />
      <View style={styles.vspace} />
      <Animated.View style={[styles.box, styles.box1, animatedStyle1]} />
      <Animated.View style={[styles.box, styles.box2, animatedStyle2]} />
      <Animated.View style={[styles.box, styles.box3, animatedStyle3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vspace: {
    height: 40,
  },
  box: {
    width: 80,
    height: 80,
    marginVertical: 8,
  },
  box1: {
    backgroundColor: 'tomato',
  },
  box2: {
    backgroundColor: 'gold',
  },
  box3: {
    backgroundColor: 'lime',
  },
});
