import Animated, {
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import React from 'react';

const BOX_SIZE = 150;

export default function AnimatedSensorMagneticFieldExample() {
  const magneticField = useAnimatedSensor(SensorType.MAGNETIC_FIELD);

  const animatedStyle = useAnimatedStyle(() => {
    const { x, y } = magneticField.sensor.value;
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    return {
      transform: [{ rotateZ: `${angle}deg` }, { translateY: BOX_SIZE / 2 }],
    };
  });

  return (
    <View style={styles.container}>
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
    width: 10,
    height: BOX_SIZE,
    backgroundColor: 'navy',
  },
});
