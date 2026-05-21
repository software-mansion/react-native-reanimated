import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  withSpring,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from '../withSharedTransitionBoundary';
import { styles } from './styles';

const TAG = 'border-radius-tag';
const TARGET_ROUTE = 'BorderRadiusScreen2';

const BORDER_RADIUS_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
    borderRadius: withSpring(values.targetBorderRadius),
  };
});

type Navigate = (route: string) => void;

export function BorderRadiusSourceSection({ navigate }: { navigate: Navigate }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>3. borderRadius</Text>
      <Text style={styles.body}>
        Same spring as the basic example, plus borderRadius read from
        values.currentBorderRadius → values.targetBorderRadius.
      </Text>
      <Text style={styles.body}>
        Expected: source is a circle (radius 50, matching its 100×100 size);
        target is a near-square with radius 16. Watch the corners round
        smoothly during the transition.
      </Text>
      <Animated.View
        style={[styles.greenBoxSource, sourceStyle]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={BORDER_RADIUS_TRANSITION}
      />
      <Button
        title='Open border-radius target screen'
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>borderRadius — target</Text>
        <Text style={styles.body}>
          The box should now be 200×300 with borderRadius 16 — almost a
          rectangle. Tap back to morph it back into a circle.
        </Text>
      </View>
      <Animated.View
        style={[styles.greenBoxTarget, targetStyle]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={BORDER_RADIUS_TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

export const BorderRadiusTargetScreen =
  withSharedTransitionBoundary(TargetContent);
export const BorderRadiusTargetRoute = TARGET_ROUTE;

const sourceStyle = { borderRadius: 50 };
const targetStyle = { borderRadius: 16 };
