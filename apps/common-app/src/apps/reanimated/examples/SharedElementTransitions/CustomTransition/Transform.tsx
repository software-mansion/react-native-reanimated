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

const TAG = 'transform-tag';
const TARGET_ROUTE = 'TransformScreen2';

const TRANSFORM_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
    transform: [{ matrix: withSpring(values.targetTransform.matrix) }],
  };
});

type Navigate = (route: string) => void;

export function TransformSourceSection({ navigate }: { navigate: Navigate }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>transform</Text>
      <Text style={styles.body}>
        Springs values.targetTransform.matrix. Source has no transform, target
        has rotate 45° + scale 1.2. The matrix is decomposed, so rotation and
        scale animate separately.
      </Text>
      <Text style={styles.body}>
        Expected: the box rotates and scales smoothly without skewing.
      </Text>
      <Animated.View
        style={styles.greenBoxSource}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={TRANSFORM_TRANSITION}
      />
      <Button
        title="Open transform target screen"
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>transform — target</Text>
        <Text style={styles.body}>
          Target has rotate 45° + scale 1.2. Tap back to spring it back to no
          transform.
        </Text>
      </View>
      <Animated.View
        style={[styles.greenBoxTarget, targetTransform]}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={TRANSFORM_TRANSITION}
      />
      <Button title="go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

export const TransformTargetScreen =
  withSharedTransitionBoundary(TargetContent);
export const TransformTargetRoute = TARGET_ROUTE;

const targetTransform = {
  transform: [{ rotate: '45deg' }, { scale: 1.2 }] as const,
};
