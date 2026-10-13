import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, Text, View } from 'react-native';
import type { SharedTransitionAnimationsValues } from 'react-native-reanimated';
import Animated, {
  SharedTransition,
  SharedTransitionType,
  withSpring,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from '../withSharedTransitionBoundary';
import { styles } from './styles';

const TAG = 'progress-custom-tag';
const TARGET_ROUTE = 'ProgressScreen2';
const PROGRESS_TYPE_TAG = 'progress-type-tag';
const PROGRESS_TYPE_TARGET_ROUTE = 'ProgressTypeScreen2';

// The box bulges 120 pt to the right halfway through, so the path tells the
// custom progress animation apart from the linear default.
function arc(values: SharedTransitionAnimationsValues, progress: number) {
  'worklet';
  const interpolate = (current: number, target: number) =>
    current + progress * (target - current);
  return {
    width: interpolate(values.currentWidth, values.targetWidth),
    height: interpolate(values.currentHeight, values.targetHeight),
    originX:
      interpolate(values.currentOriginX, values.targetOriginX) +
      Math.sin(Math.PI * progress) * 120,
    originY: interpolate(values.currentOriginY, values.targetOriginY),
  };
}

const PROGRESS_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
})
  .progressAnimation(arc)
  .defaultTransitionType(SharedTransitionType.ANIMATION);

const PROGRESS_TYPE_TRANSITION = SharedTransition.progressAnimation(arc)
  .duration(800)
  .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION);

type Navigate = (route: string) => void;

export function ProgressSourceSection({ navigate }: { navigate: Navigate }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>.progressAnimation()</Text>
      <Text style={styles.body}>
        .custom() spring for opening the screen, plus a progressAnimation that
        bends the path into an arc.
      </Text>
      <Text style={styles.body}>
        Expected: opening → straight spring. iOS back navigation (swipe or back
        button) → box follows the arc with the screen transition.
      </Text>
      <Animated.View
        style={styles.greenBoxSource}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={PROGRESS_TRANSITION}
      />
      <Button
        title="Open progress target screen"
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

export function ProgressTypeSourceSection({
  navigate,
}: {
  navigate: Navigate;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        .defaultTransitionType(PROGRESS_ANIMATION)
      </Text>
      <Text style={styles.body}>
        The same arc is used for every transition. Opening the screen drives the
        progress with an 800 ms timing animation.
      </Text>
      <Text style={styles.body}>
        Expected: the box follows the arc in both directions.
      </Text>
      <Animated.View
        style={styles.greenBoxSource}
        sharedTransitionTag={PROGRESS_TYPE_TAG}
        sharedTransitionStyle={PROGRESS_TYPE_TRANSITION}
      />
      <Button
        title="Open progress type target screen"
        onPress={() => navigate(PROGRESS_TYPE_TARGET_ROUTE)}
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
          iOS: swipe slowly from the left edge — the box follows the arc with
          your finger. Release past the threshold to complete, release early to
          cancel.
        </Text>
      </View>
      <Animated.View
        style={styles.greenBoxTarget}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={PROGRESS_TRANSITION}
      />
      <Button title="go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

function ProgressTypeTargetContent({
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>PROGRESS_ANIMATION — target</Text>
        <Text style={styles.body}>
          Expected: the box arrived along the arc and goes back along it.
        </Text>
      </View>
      <Animated.View
        style={styles.greenBoxTarget}
        sharedTransitionTag={PROGRESS_TYPE_TAG}
        sharedTransitionStyle={PROGRESS_TYPE_TRANSITION}
      />
      <Button title="go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

export const ProgressTargetScreen = withSharedTransitionBoundary(TargetContent);
export const ProgressTargetRoute = TARGET_ROUTE;
export const ProgressTypeTargetScreen = withSharedTransitionBoundary(
  ProgressTypeTargetContent
);
export const ProgressTypeTargetRoute = PROGRESS_TYPE_TARGET_ROUTE;
