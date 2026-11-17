import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  clamp,
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const OFFSET_X = 100; // in px
const OFFSET_Y = 100; // in px
const OFFSET_Z = 180; // in degrees
const NEEDLE_LENGTH = 150;

const DEVICE_POSITION =
  'Device must be parallel to the ground with screen facing up and top edge of the screen facing forward';

function AccelerometerBox() {
  const accelerometer = useAnimatedSensor(SensorType.ACCELEROMETER);

  const xOffset = useSharedValue(-OFFSET_X);
  const yOffset = useSharedValue(0);
  const zOffset = useSharedValue(1);

  useAnimatedReaction(
    () => accelerometer.sensor.value,
    ({ x, y, z }) => {
      xOffset.value = clamp(xOffset.value - x, -OFFSET_X * 2, OFFSET_X / 4);
      yOffset.value = clamp(yOffset.value - y, -OFFSET_Y, OFFSET_Y);
      zOffset.value = clamp(zOffset.value + z * 0.1, 0.5, 2);
    }
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withSpring(-OFFSET_X - xOffset.value) },
        { translateY: withSpring(yOffset.value) },
        { scaleX: withSpring(zOffset.value) },
        { scaleY: withSpring(zOffset.value) },
      ],
    };
  });

  return <Animated.View style={[styles.box, animatedStyle]} />;
}

function GyroscopeBox() {
  const gyroscope = useAnimatedSensor(SensorType.GYROSCOPE);

  const xOffset = useSharedValue(-OFFSET_X);
  const yOffset = useSharedValue(0);
  const zOffset = useSharedValue(0);

  useAnimatedReaction(
    () => gyroscope.sensor.value,
    ({ x, y, z }) => {
      // The x vs y here seems wrong but is the way to make it feel right to the user
      xOffset.value = clamp(xOffset.value + y, -OFFSET_X * 2, OFFSET_X / 4);
      yOffset.value = clamp(yOffset.value - x, -OFFSET_Y, OFFSET_Y);
      zOffset.value = clamp(zOffset.value + z, -OFFSET_Z, OFFSET_Z);
    }
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withSpring(-OFFSET_X - xOffset.value) },
        { translateY: withSpring(yOffset.value) },
        { rotateZ: `${zOffset.value}deg` },
      ],
    };
  });

  return <Animated.View style={[styles.box, animatedStyle]} />;
}

function GravityBox() {
  const gravity = useAnimatedSensor(SensorType.GRAVITY);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      top: -gravity.sensor.value.y * 300,
      left: gravity.sensor.value.x * 200,
    };
  });

  return <Animated.View style={[styles.gravityBox, animatedStyle]} />;
}

function MagneticFieldNeedle() {
  const magneticField = useAnimatedSensor(SensorType.MAGNETIC_FIELD);

  const animatedStyle = useAnimatedStyle(() => {
    const { x, y } = magneticField.sensor.value;
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    return {
      transform: [
        { rotateZ: `${angle}deg` },
        { translateY: NEEDLE_LENGTH / 2 },
      ],
    };
  });

  return <Animated.View style={[styles.needle, animatedStyle]} />;
}

function RotationBox() {
  const rotation = useAnimatedSensor(SensorType.ROTATION);

  const animatedStyle = useAnimatedStyle(() => {
    const { pitch, roll, yaw } = rotation.sensor.value;
    return {
      transform: [
        { perspective: 100 },
        // https://developer.apple.com/documentation/coremotion/cmattitude#1669448
        // A pitch is a rotation around a lateral axis that passes through the device from side to side.
        // we are negating the value to make the behavior more as user would expect
        { rotateX: `${-pitch}rad` },
        // A roll is a rotation around a longitudinal axis that passes through the device from its top to bottom.
        { rotateY: `${roll}rad` },
        // A yaw is a rotation around an axis that runs vertically through the device. It is perpendicular to the body
        // of the device, with its origin at the center of gravity and directed toward the bottom of the device.
        { rotateZ: `${yaw}rad` },
      ],
    };
  });

  return <Animated.View style={[styles.rotationBox, animatedStyle]} />;
}

type SensorOption = {
  label: string;
  Component: React.FC;
  instructions: string[];
};

const SENSORS: SensorOption[] = [
  {
    label: 'Accelerometer',
    Component: AccelerometerBox,
    instructions: [
      DEVICE_POSITION,
      'On acceleration to the right, the box should move to the left',
      'On acceleration to the left, the box should move to the right',
      'On acceleration forward, the box should move backward',
      'On acceleration backward, the box should move forward',
      'On acceleration up, the box should get smaller',
      'On acceleration down, the box should get bigger',
    ],
  },
  {
    label: 'Gyroscope',
    Component: GyroscopeBox,
    instructions: [
      DEVICE_POSITION,
      'On tilt right, the box should move to the left',
      'On tilt left, the box should move to the right',
      'On tilt forward, the box should move backward',
      'On tilt backward, the box should move forward',
      'On turning phone clockwise, the box should turn counter clockwise',
      'On turning phone counter clockwise, the box should turn clockwise',
    ],
  },
  {
    label: 'Gravity',
    Component: GravityBox,
    instructions: [
      DEVICE_POSITION,
      'On tilt right, the box should move to the right of the screen',
      'On tilt left, the box should move to the left of the screen',
      'On tilt forward, the box should move to the top of the screen',
      'On tilt backward, the box should move to the bottom of the screen',
    ],
  },
  {
    label: 'Magnetic field',
    Component: MagneticFieldNeedle,
    instructions: [],
  },
  {
    label: 'Rotation',
    Component: RotationBox,
    instructions: [
      DEVICE_POSITION,
      'On tilt right, the blue edge should enlarge',
      'On tilt left, the red edge should enlarge',
      'On tilt forward, the green edge should enlarge',
      'On tilt backward, the yellow edge should enlarge',
      'On turning phone clockwise, the box should rotate counter clockwise',
      'On turning phone counter clockwise, the box should rotate clockwise',
    ],
  },
];

export default function AnimatedSensorExample() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { Component, instructions } = SENSORS[selectedIndex];

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        {SENSORS.map(({ label }, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.option, selected && styles.selectedOption]}
              onPress={() => setSelectedIndex(index)}>
              <Text
                style={[
                  styles.optionText,
                  selected && styles.selectedOptionText,
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.instructions}>
        {instructions.map((instruction) => (
          <Text key={instruction}>{instruction}</Text>
        ))}
      </View>
      <View style={styles.stage}>
        <Component />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
  },
  option: {
    borderColor: 'navy',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedOption: {
    backgroundColor: 'navy',
  },
  optionText: {
    color: 'navy',
  },
  selectedOptionText: {
    color: 'white',
  },
  instructions: {
    marginHorizontal: 16,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: 'navy',
    height: 100,
    width: 100,
  },
  gravityBox: {
    backgroundColor: 'navy',
    height: 150,
    width: 150,
  },
  needle: {
    backgroundColor: 'navy',
    height: NEEDLE_LENGTH,
    width: 10,
  },
  rotationBox: {
    width: 150,
    height: 150,
    borderWidth: 10,
    backgroundColor: 'navy',
    borderTopColor: 'yellow',
    borderRightColor: 'red',
    borderLeftColor: 'blue',
    borderBottomColor: 'green',
  },
});
