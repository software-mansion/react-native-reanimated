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
  // values.currentTransformMatrix / values.targetTransformMatrix are
  // deprecated. They are NOT populated in v4 — both will be undefined here.
  // Logging is the whole point: this example demonstrates the absence of the
  // value. For a real transform animation, use values.targetTransform (an
  // operation list) instead.
  console.log(
    '[TransformMatrix] currentTransformMatrix:',
    values.currentTransformMatrix,
  );
  console.log(
    '[TransformMatrix] targetTransformMatrix:',
    values.targetTransformMatrix,
  );
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
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
        7. transformMatrix is deprecated — use transform
      </Text>
      <Text style={styles.body}>
        currentTransformMatrix / targetTransformMatrix are undefined in v4.
        Matrix-lerp degenerated non-translation transforms; use
        targetTransform (operation list) instead.
      </Text>
      <Animated.View
        style={styles.greenBoxSource}
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
        style={styles.greenBoxTarget}
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
