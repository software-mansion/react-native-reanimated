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

const ORIGIN_TAG = 'origin-tag';
const GLOBAL_TAG = 'global-origin-tag';
const ORIGIN_TARGET_ROUTE = 'OriginScreen2';
const GLOBAL_TARGET_ROUTE = 'GlobalOriginScreen2';

const ORIGIN_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
});

const GLOBAL_ORIGIN_TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    originX: withSpring(values.targetGlobalOriginX),
    originY: withSpring(values.targetGlobalOriginY),
  };
});

type Navigate = (route: string) => void;

export function GlobalOriginSourceSection({
  navigate,
}: {
  navigate: Navigate;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        4. globalOrigin is deprecated — use originX/Y
      </Text>
      <Text style={styles.body}>
        values.targetGlobalOriginX/Y is always 0 in shared transitions. Use
        targetOriginX/Y instead. In v3 globalOrigin is 0 on Android, on iOS it
        was equal to regular origin. In v3 on iOS, origin is equal to
        globalOrigin.
      </Text>

      <View style={offsetContainer}>
        <Animated.View
          style={styles.greenBoxSource}
          sharedTransitionTag={ORIGIN_TAG}
          sharedTransitionStyle={ORIGIN_TRANSITION}
        />
      </View>
      <Button
        title='Open with originX/Y (works)'
        onPress={() => navigate(ORIGIN_TARGET_ROUTE)}
      />

      <View style={[offsetContainer, gapTop]}>
        <Animated.View
          style={[styles.greenBoxSource, redBox]}
          sharedTransitionTag={GLOBAL_TAG}
          sharedTransitionStyle={GLOBAL_ORIGIN_TRANSITION}
        />
      </View>
      <Button
        title='Open with globalOriginX/Y (broken — animates to 0,0)'
        onPress={() => navigate(GLOBAL_TARGET_ROUTE)}
      />
    </View>
  );
}

function OriginTargetContent({
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>originX/Y — target</Text>
        <Text style={styles.body}>
          Expected: spring lands at the target position.
        </Text>
      </View>
      <View style={targetParent}>
        <Animated.View
          style={targetBox}
          sharedTransitionTag={ORIGIN_TAG}
          sharedTransitionStyle={ORIGIN_TRANSITION}
        />
      </View>
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

function GlobalOriginTargetContent({
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>globalOriginX/Y — target (broken)</Text>
        <Text style={styles.body}>
          Expected: red box springs to (0, 0) because globalOrigin is always 0.
        </Text>
      </View>
      <View style={targetParent}>
        <Animated.View
          style={[targetBox, redBox]}
          sharedTransitionTag={GLOBAL_TAG}
          sharedTransitionStyle={GLOBAL_ORIGIN_TRANSITION}
        />
      </View>
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

export const OriginTargetScreen =
  withSharedTransitionBoundary(OriginTargetContent);
export const OriginTargetRoute = ORIGIN_TARGET_ROUTE;
export const GlobalOriginTargetScreen = withSharedTransitionBoundary(
  GlobalOriginTargetContent,
);
export const GlobalOriginTargetRoute = GLOBAL_TARGET_ROUTE;

const offsetContainer = { paddingLeft: 80, paddingTop: 24 };
const gapTop = { marginTop: 16 };
const redBox = { backgroundColor: 'crimson' as const };
const targetBox = {
  width: 100,
  height: 100,
  marginLeft: 60,
  marginTop: 24,
  backgroundColor: 'green' as const,
};
const targetParent = { paddingTop: 300, paddingLeft: 0 };
