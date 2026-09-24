import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  HingeStatus,
  interpolateColor,
  SensorType,
  useAnimatedProps,
  useAnimatedSensor,
  useAnimatedStyle,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const GREEN = '#57b495';

const STATUS_NAMES = {
  [HingeStatus.UNKNOWN]: 'UNKNOWN',
  [HingeStatus.CLOSED]: 'CLOSED',
  [HingeStatus.PARTIALLY_OPEN]: 'PARTIALLY_OPEN',
  [HingeStatus.FULLY_OPEN]: 'FULLY_OPEN',
};

export default function AnimatedHingeExample() {
  const hinge = useAnimatedSensor(SensorType.HINGE);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateY: `${(Math.PI - hinge.sensor.value.angle) / 2}rad` },
    ],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateY: `${-(Math.PI - hinge.sensor.value.angle) / 2}rad` },
    ],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      hinge.sensor.value.angle,
      [0, Math.PI],
      ['#1b1b3a', '#fdf6e3'],
      'LAB'
    ),
  }));

  const radiansProps = useAnimatedProps(() => {
    const text = `${hinge.sensor.value.angle.toFixed(4)} rad`;
    return { text, defaultValue: text };
  });

  const degreesProps = useAnimatedProps(() => {
    const text = `${((hinge.sensor.value.angle * 180) / Math.PI).toFixed(1)}°`;
    return { text, defaultValue: text };
  });

  const statusProps = useAnimatedProps(() => {
    const text = STATUS_NAMES[hinge.sensor.value.status];
    return { text, defaultValue: text };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Text style={styles.heading}>Static</Text>
      <View style={styles.book}>
        <View style={[styles.page, styles.left]} />
        <View style={[styles.page, styles.right]} />
      </View>
      <Text style={styles.heading}>Driven by hinge angle</Text>
      <View style={styles.book}>
        <Animated.View style={[styles.page, styles.left, leftStyle]} />
        <Animated.View style={[styles.page, styles.right, rightStyle]} />
      </View>
      <Text style={styles.label}>isAvailable</Text>
      <Text style={styles.value}>{String(hinge.isAvailable)}</Text>
      <Text style={styles.label}>angle</Text>
      <AnimatedTextInput
        editable={false}
        animatedProps={radiansProps}
        style={styles.value}
      />
      <AnimatedTextInput
        editable={false}
        animatedProps={degreesProps}
        style={styles.value}
      />
      <Text style={styles.label}>status</Text>
      <AnimatedTextInput
        editable={false}
        animatedProps={statusProps}
        style={styles.value}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    color: GREEN,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: GREEN,
    opacity: 0.7,
  },
  value: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    color: GREEN,
  },
  book: {
    flexDirection: 'row',
  },
  page: {
    width: 120,
    height: 120,
    backgroundColor: '#782aeb',
  },
  left: {
    transformOrigin: 'right',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  right: {
    transformOrigin: 'left',
    backgroundColor: GREEN,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
});
