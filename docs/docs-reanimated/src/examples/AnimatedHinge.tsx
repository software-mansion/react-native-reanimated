import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  useDerivedValue,
  SensorType,
  HingeStatus,
} from 'react-native-reanimated';

export default function App() {
  // highlight-next-line
  const hinge = useAnimatedSensor(SensorType.HINGE);

  const foldAngle = useDerivedValue(() => {
    const { angle, status } = hinge.sensor.value;
    // highlight-next-line
    return status === HingeStatus.UNKNOWN ? 0 : (Math.PI - angle) / 2;
  });

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${foldAngle.value}rad` }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${-foldAngle.value}rad` }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.panel, styles.left, leftStyle]} />
      <Animated.View style={[styles.panel, styles.right, rightStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: 90,
    height: 180,
    backgroundColor: '#b58df1',
  },
  left: {
    transformOrigin: 'right',
  },
  right: {
    transformOrigin: 'left',
  },
});
