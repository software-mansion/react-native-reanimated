import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionType,
  withSpring,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from '../withSharedTransitionBoundary';
import { styles } from './styles';

const TAG = 'progress-custom-tag';
const TARGET_ROUTE = 'ProgressScreen2';

const PROGRESS_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
})
  .progressAnimation((values, progress) => {
    'worklet';
    const interpolate = (
      progress: number,
      current: number,
      target: number,
    ): number => {
      return progress * (target - current) + current;
    };
    return {
      width: interpolate(progress, values.currentWidth, values.targetWidth),
      height: interpolate(progress, values.currentHeight, values.targetHeight),
      originX: interpolate(
        progress,
        values.currentOriginX,
        values.targetOriginX,
      ),
      originY: interpolate(
        progress,
        values.currentOriginY,
        values.targetOriginY,
      ),
    };
  })
  .defaultTransitionType(SharedTransitionType.ANIMATION);

type Navigate = (route: string) => void;

export function ProgressSourceSection({ navigate }: { navigate: Navigate }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>.progressAnimation()</Text>
      <Text style={styles.body}>
        Same .custom() spring for tap-navigation, plus a linear
        progressAnimation used by gesture-driven transitions.
      </Text>
      <Text style={styles.body}>
        Expected: tap → spring. iOS slow swipe-back from target → box tracks
        finger linearly.
      </Text>
      <Animated.View
        style={styles.greenBoxSource}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={PROGRESS_TRANSITION}
      />
      <Button
        title='Open progress target screen'
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>.progressAnimation() — target</Text>
        <Text style={styles.body}>
          iOS only: swipe slowly from the left edge — box should track your
          finger linearly. Release past threshold to complete, release early to
          cancel.
        </Text>
        <Text style={styles.body}>
          Tap back instead to see the springy .custom in reverse.
        </Text>
      </View>
      <Animated.View
        style={styles.greenBoxTarget}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={PROGRESS_TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

export const ProgressTargetScreen = withSharedTransitionBoundary(TargetContent);
export const ProgressTargetRoute = TARGET_ROUTE;
