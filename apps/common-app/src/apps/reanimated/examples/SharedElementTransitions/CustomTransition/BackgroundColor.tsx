import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  withTiming,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from '../withSharedTransitionBoundary';
import { styles } from './styles';

const TAG = 'background-color-tag';
const TARGET_ROUTE = 'BackgroundColorScreen2';

const BACKGROUND_COLOR_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withTiming(values.targetWidth),
    height: withTiming(values.targetHeight),
    originX: withTiming(values.targetOriginX),
    originY: withTiming(values.targetOriginY),
    backgroundColor: withTiming(values.targetBackgroundColor),
  };
});

type Navigate = (route: string) => void;

export function BackgroundColorSourceSection({
  navigate,
}: {
  navigate: Navigate;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>backgroundColor</Text>
      <Text style={styles.body}>
        Interpolates values.currentBackgroundColor → values.targetBackgroundColor.
        Expected: source is green, target is dodgerblue; color blends through
        the transition.
      </Text>
      <Animated.View
        style={[styles.greenBoxSource, sourceColor]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={BACKGROUND_COLOR_TRANSITION}
      />
      <Button
        title='Open background-color target screen'
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>backgroundColor — target</Text>
        <Text style={styles.body}>
          Target color is dodgerblue. Tap back to morph it back to green.
        </Text>
      </View>
      <Animated.View
        style={[styles.greenBoxTarget, targetColor]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={BACKGROUND_COLOR_TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

export const BackgroundColorTargetScreen =
  withSharedTransitionBoundary(TargetContent);
export const BackgroundColorTargetRoute = TARGET_ROUTE;

const sourceColor = { backgroundColor: 'green' as const };
const targetColor = { backgroundColor: 'dodgerblue' as const };
