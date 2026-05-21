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

const TAG = 'basic-custom-tag';
const TARGET_ROUTE = 'BasicScreen2';

const BASIC_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
});

type Navigate = (route: string) => void;

export function BasicSourceSection({ navigate }: { navigate: Navigate }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Basic .custom()</Text>
      <Text style={styles.body}>
        Spring-interpolates width/height/origin via withSpring. No
        progressAnimation — iOS swipe-back falls back to the system default.
      </Text>
      <Text style={styles.body}>Expected: springy overshoot-and-settle.</Text>
      <Animated.View
        style={styles.greenBoxSource}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={BASIC_TRANSITION}
      />
      <Button
        title='Open basic target screen'
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>Basic .custom() — target</Text>
        <Text style={styles.body}>
          The green box should now sit at 200×300, lower and further right than
          on the menu. Tap back to spring-return. iOS swipe-back uses the
          system default (no progressAnimation registered here).
        </Text>
      </View>
      <Animated.View
        style={styles.greenBoxTarget}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={BASIC_TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

export const BasicTargetScreen = withSharedTransitionBoundary(TargetContent);
export const BasicTargetRoute = TARGET_ROUTE;
