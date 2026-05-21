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

const TAG = 'opacity-tag';
const TARGET_ROUTE = 'OpacityScreen2';

const OPACITY_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withTiming(values.targetWidth),
    height: withTiming(values.targetHeight),
    originX: withTiming(values.targetOriginX),
    originY: withTiming(values.targetOriginY),
    opacity: withTiming(values.targetOpacity),
  };
});

type Navigate = (route: string) => void;

export function OpacitySourceSection({ navigate }: { navigate: Navigate }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>6. opacity</Text>
      <Text style={styles.body}>
        Interpolates values.currentOpacity → values.targetOpacity. Expected:
        source is fully opaque, target is 0.2; box fades during the transition.
      </Text>
      <Animated.View
        style={[styles.greenBoxSource, sourceOpacity]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={OPACITY_TRANSITION}
      />
      <Button
        title='Open opacity target screen'
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>opacity — target</Text>
        <Text style={styles.body}>
          Target opacity is 0.2. Tap back to fade it back to fully opaque.
        </Text>
      </View>
      <Animated.View
        style={[styles.greenBoxTarget, targetOpacity]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={OPACITY_TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

export const OpacityTargetScreen = withSharedTransitionBoundary(TargetContent);
export const OpacityTargetRoute = TARGET_ROUTE;

const sourceOpacity = { opacity: 1 };
const targetOpacity = { opacity: 0.2 };
