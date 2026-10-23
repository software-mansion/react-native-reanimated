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

const TAG = 'transform-matrix-tag';
const TARGET_ROUTE = 'TransformMatrixScreen2';

const TRANSFORM_MATRIX_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
    transformMatrix: withSpring(values.targetTransformMatrix),
  };
});

type Navigate = (route: string) => void;

export function TransformMatrixSourceSection({
  navigate,
}: {
  navigate: Navigate;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>transformMatrix (Reanimated 3)</Text>
      <Text style={styles.body}>
        Reads values.targetTransformMatrix and animates the transformMatrix
        style, as Reanimated 3 transitions did. The output is mapped to
        transform: [{'{'} matrix {'}'}].
      </Text>
      <Text style={styles.body}>
        Expected: the box rotates by 30° and scales by 1.2.
      </Text>
      <Animated.View
        style={[styles.greenBoxSource, redBox]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={TRANSFORM_MATRIX_TRANSITION}
      />
      <Button
        title="Open transformMatrix target screen"
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>transformMatrix — target</Text>
        <Text style={styles.body}>
          Target has rotate 30° + scale 1.2. Tap back to spring it back to no
          transform.
        </Text>
      </View>
      <Animated.View
        style={[styles.greenBoxTarget, redBox, targetTransform]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={TRANSFORM_MATRIX_TRANSITION}
      />
      <Button title="go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

export const TransformMatrixTargetScreen =
  withSharedTransitionBoundary(TargetContent);
export const TransformMatrixTargetRoute = TARGET_ROUTE;

const redBox = { backgroundColor: 'crimson' as const };
const targetTransform = {
  transform: [{ rotate: '30deg' }, { scale: 1.2 }] as const,
};
