import { Button, LogBox, Slider, StyleSheet, Text, View } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  GestureUpdateEvent,
  PanGestureChangeEventPayload,
} from 'react-native-gesture-handler';

function LogSlider({
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  ...props
}) {
  return (
    <Slider
      minimumValue={Math.log(minimumValue)}
      maximumValue={Math.log(maximumValue)}
      value={Math.log(value)}
      onValueChange={(newValue: number) => onValueChange(Math.exp(newValue))}
      {...props}
    />
  );
}

function LogSliderWithLabel({ label, value, onValueChange }) {
  return (
    <>
      <Text>
        {label} = {value.toFixed(0)}
      </Text>
      <LogSlider
        minimumValue={1}
        maximumValue={3000}
        value={value}
        onValueChange={onValueChange}
        style={styles.slider}
      />
    </>
  );
}

const DEFAULT_MASS = 1;
const DEFAULT_STIFFNESS = 100;
const DEFAULT_DAMPING = 10;

export default function SpringExample() {
  const [mass, setMass] = React.useState(DEFAULT_MASS);
  const [stiffness, setStiffness] = React.useState(DEFAULT_STIFFNESS);
  const [damping, setDamping] = React.useState(DEFAULT_DAMPING);

  const isPressed = useSharedValue(false);
  const offset = useSharedValue(0);

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      'worklet';
      isPressed.value = true;
    })
    .onChange((e: GestureUpdateEvent<PanGestureChangeEventPayload>) => {
      'worklet';
      offset.value += e.changeX;
    })
    .onFinalize(() => {
      'worklet';
      isPressed.value = false;
      offset.value = withSpring(0, { mass, stiffness, damping });
    });

  const animatedStyle = useAnimatedStyle(() => {
    console.log(offset.value);
    return { transform: [{ translateX: offset.value }] };
  });

  const handleReset = () => {
    setMass(DEFAULT_MASS);
    setStiffness(DEFAULT_STIFFNESS);
    setDamping(DEFAULT_DAMPING);
  };

  const handleCancel = () => {
    offset.value = 0;
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <LogSliderWithLabel label="Mass" value={mass} onValueChange={setMass} />
        <LogSliderWithLabel
          label="Stiffness"
          value={stiffness}
          onValueChange={setStiffness}
        />
        <LogSliderWithLabel
          label="Damping"
          value={damping}
          onValueChange={setDamping}
        />
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.box, animatedStyle]} />
        </GestureDetector>
        <Button title="Reset values" onPress={handleReset} />
        <Button title="Cancel animation" onPress={handleCancel} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    width: 250,
    marginTop: 5,
    marginBottom: 20,
  },
  box: {
    marginTop: 30,
    marginBottom: 50,
    width: 90,
    height: 90,
    backgroundColor: 'navy',
  },
});

LogBox.ignoreLogs(['Slider has been extracted']);
