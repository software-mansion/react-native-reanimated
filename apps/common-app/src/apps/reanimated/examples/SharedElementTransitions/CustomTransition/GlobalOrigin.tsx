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

const TAG = 'global-origin-tag';
const TARGET_ROUTE = 'GlobalOriginScreen2';

// Uses globalOriginX/Y (window-space) instead of originX/Y (local-space).
// The source box is wrapped in an offset container, so its local origin
// differs from its global origin — the transition should still land the
// target in the right window-space position.
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
      <Text style={styles.heading}>4. globalOriginX / globalOriginY</Text>
      <Text style={styles.body}>
        origin = parent-relative; globalOrigin = window-relative. Use
        globalOrigin when source and target have differently-positioned parents
        (scroll views, headers, etc.) — otherwise use origin.
      </Text>
      <Text style={styles.body}>
        Source is nested in an offset container. Expected: target lands at the
        right on-screen position regardless of the parent offset.
      </Text>
      <View style={offsetContainer}>
        <Animated.View
          style={styles.greenBoxSource}
          sharedTransitionTag={TAG}
          sharedTransitionStyle={GLOBAL_ORIGIN_TRANSITION}
        />
      </View>
      <Button
        title='Open global-origin target screen'
        onPress={() => navigate(TARGET_ROUTE)}
      />
    </View>
  );
}

function TargetContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>
          globalOriginX / globalOriginY — target
        </Text>
        <Text style={styles.body}>
          Same 100×100 size as on the menu, positioned further down/right by
          window-space origin only. Tap back to spring return to the
          offset-nested source.
        </Text>
      </View>
      <Animated.View
        style={targetBox}
        sharedTransitionTag={TAG}
        sharedTransitionStyle={GLOBAL_ORIGIN_TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.goBack()} />
    </View>
  );
}

export const GlobalOriginTargetScreen =
  withSharedTransitionBoundary(TargetContent);
export const GlobalOriginTargetRoute = TARGET_ROUTE;

const offsetContainer = { paddingLeft: 80, paddingTop: 24 };
const targetBox = {
  width: 100,
  height: 100,
  marginLeft: 60,
  marginTop: 200,
  backgroundColor: 'green' as const,
};
