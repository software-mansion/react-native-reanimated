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
  const targetMatrix = values.targetTransformMatrix;
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
    transform: [{ matrix: withSpring(targetMatrix) }],
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
      <Text style={styles.heading}>
        transformMatrix (deprecated — use transform.matrix)
      </Text>
      <Text style={styles.body}>
        Verifies that the v3-style `values.targetTransformMatrix` (flat
        16-element 4×4) still works. Same matrix as
        `values.targetTransform.matrix`; the deprecated alias is kept for
        backward compatibility.
      </Text>
      <Text style={styles.body}>
        Expected: matrix-interpolation from identity to rotate-30° + scale-1.2.
        The intermediate frames are slightly degenerate (the box may wobble
        mid-animation) — a documented limitation of the matrix-interpolation
        path and the reason `transformMatrix` is deprecated.
      </Text>
      <Animated.View
        style={[styles.greenBoxSource, redBox]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={TRANSFORM_MATRIX_TRANSITION}
      />
      <Button
        title='Open transformMatrix target screen'
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
          Check the console: both currentTransformMatrix and
          targetTransformMatrix log as undefined. The width/height/origin spring
          still works because it does not depend on the matrix fields.
        </Text>
      </View>
      <Animated.View
        style={[styles.greenBoxTarget, redBox, targetTransform]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={TRANSFORM_MATRIX_TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.goBack()} />
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
