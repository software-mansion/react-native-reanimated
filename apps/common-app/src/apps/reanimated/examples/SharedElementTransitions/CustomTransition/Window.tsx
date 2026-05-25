import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from '../withSharedTransitionBoundary';
import { styles } from './styles';

const TAG = 'window-tag';
const TARGET_ROUTE = 'WindowScreen2';

// Two-stage animation. First leg goes to the bottom-right corner of the
// window (computed from values.windowWidth / values.windowHeight), second
// leg returns to the natural target position. The bottom-right detour is
// reached at the midpoint of the transition.
const LEG_MS = 400;
const WINDOW_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  const cornerX = values.windowWidth - values.targetWidth;
  const cornerY = values.windowHeight - values.targetHeight;
  return {
    originX: withSequence(
      withTiming(cornerX, { duration: LEG_MS }),
      withTiming(values.targetOriginX, { duration: LEG_MS }),
    ),
    originY: withSequence(
      withTiming(cornerY, { duration: LEG_MS }),
      withTiming(values.targetOriginY, { duration: LEG_MS }),
    ),
  };
});

type Navigate = (route: string) => void;

export function WindowSourceSection({ navigate }: { navigate: Navigate }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>windowWidth / windowHeight</Text>
      <Text style={styles.body}>
        Uses `values.windowWidth` and `values.windowHeight` to compute a
        bottom-right waypoint. The worklet sequences two timing legs:
        source → bottom-right corner → final target.
      </Text>
      <Text style={styles.body}>
        Expected: the box travels to the bottom-right corner at the midpoint
        of the transition, then continues to the target position.
      </Text>
      <Animated.View
        style={styles.greenBoxSource}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={WINDOW_TRANSITION}
      />
      <Button
        title='Open window-derived target screen'
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>windowWidth / windowHeight — target</Text>
        <Text style={styles.body}>
          The transition routes the box through the bottom-right corner of
          the viewport (windowWidth - width, windowHeight - height) before
          landing here.
        </Text>
      </View>
      <Animated.View
        style={[styles.greenBoxTarget, sameSizeAsSource]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={WINDOW_TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

export const WindowTargetScreen = withSharedTransitionBoundary(TargetContent);
export const WindowTargetRoute = TARGET_ROUTE;

// Force the target box to match the source box's 100×100 size, overriding
// greenBoxTarget's default 200×300. Keeps width/height constant across the
// transition so only originX/originY animate.
const sameSizeAsSource = { width: 100, height: 100 };
