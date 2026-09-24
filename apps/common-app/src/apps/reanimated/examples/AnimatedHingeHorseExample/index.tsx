import { useNavigation } from '@react-navigation/native';
import React, { useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SensorType,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedSensor,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import { HORSE_WHITE } from './colors';
import HingeCodeExample from './HingeCodeExample';
import { HORSE_FRAMES } from './horseFrames';
import RunningHorse from './RunningHorse';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const GALLOP_START_ANGLE = Math.PI / 2;
const GALLOP_END_ANGLE = Math.PI;
const HINGE_TRAVEL_PER_FRAME = Math.PI / 90;
const CODE_EXAMPLE_MAX_ANGLE = Math.PI / 4;

export default function AnimatedHingeHorseExample() {
  const navigation = useNavigation();
  const hinge = useAnimatedSensor(SensorType.HINGE);
  const hingeTravel = useSharedValue(0);
  const [runsOnlyForward, setRunsOnlyForward] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ statusBarStyle: 'light' });
  }, [navigation]);

  useAnimatedReaction(
    () => hinge.sensor.value.angle,
    (angle, previousAngle) => {
      if (previousAngle !== null) {
        hingeTravel.value += Math.abs(angle - previousAngle);
      }
    }
  );

  const visibleFrameIndex = useDerivedValue(() => {
    const hingeDistance = runsOnlyForward
      ? hingeTravel.value
      : interpolate(
          hinge.sensor.value.angle,
          [GALLOP_START_ANGLE, GALLOP_END_ANGLE],
          [0, GALLOP_END_ANGLE - GALLOP_START_ANGLE],
          Extrapolation.CLAMP
        );
    return (
      Math.floor(hingeDistance / HINGE_TRAVEL_PER_FRAME) % HORSE_FRAMES.length
    );
  });

  const isCodeExampleVisible = useDerivedValue(
    () => hinge.sensor.value.angle < CODE_EXAMPLE_MAX_ANGLE
  );

  const angleProps = useAnimatedProps(() => {
    const text = `${((hinge.sensor.value.angle * 180) / Math.PI).toFixed(1)}°`;
    return { text, defaultValue: text };
  });

  return (
    <View style={styles.container}>
      <RunningHorse
        visibleFrameIndex={visibleFrameIndex}
        caption={
          <>
            <AnimatedTextInput
              editable={false}
              animatedProps={angleProps}
              style={styles.angle}
            />
            <Pressable
              style={styles.modeButton}
              onPress={() => setRunsOnlyForward((current) => !current)}>
              <Text style={styles.modeButtonLabel}>
                {runsOnlyForward ? 'Runs only forward' : 'Follows the hinge'}
              </Text>
            </Pressable>
          </>
        }
      />
      <HingeCodeExample isVisible={isCodeExampleVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  angle: {
    marginTop: 24,
    fontSize: 32,
    fontVariant: ['tabular-nums'],
    color: HORSE_WHITE,
  },
  modeButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: HORSE_WHITE,
  },
  modeButtonLabel: {
    fontSize: 16,
    color: HORSE_WHITE,
  },
});
