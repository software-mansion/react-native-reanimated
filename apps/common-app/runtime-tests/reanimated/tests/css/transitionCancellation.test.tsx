import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { ValidPropNames } from '../../../ReJest/types';

const ANIMATED_REF = 'CSSTransitionCancellationAnimated';
const REFERENCE_REF = 'CSSTransitionCancellationReference';

const TRANSITION_SETTINGS = {
  transitionDuration: '1s',
  transitionTimingFunction: 'linear',
} as const;

type TransitionProperty = 'width' | 'height' | 'marginTop';

type DeselectionCase = {
  name: string;
  initialStyle: ViewStyle;
  targetStyle: ViewStyle;
  transitionProperty: Array<TransitionProperty>;
  // Layout prop through which the deselected property is observed
  observedProp: ValidPropNames;
};

// Layout props are used on purpose: opacity and colors may run on platform
// animations, which are not the path under test.
const CASES: Array<DeselectionCase> = [
  {
    initialStyle: { height: 40, width: 40 },
    name: 'present in the style',
    observedProp: 'height',
    targetStyle: { height: 120, width: 160 },
    transitionProperty: ['width', 'height'],
  },
  {
    initialStyle: { marginTop: 100, width: 40 },
    // marginTop leaves the style one render before the deselect, so its
    // transition (to the default 0) is a key of neither style snapshot and
    // only the running transitions know about it. The frame top exposes it.
    name: 'transitioning to undefined',
    observedProp: 'top',
    targetStyle: { width: 160 },
    transitionProperty: ['width', 'marginTop'],
  },
];

// Yoga rounds each box to the pixel grid from its own absolute position, which
// leaves float noise (about 1e-5) between two boxes with the same style.
const SNAP_TOLERANCE = 0.01;

async function readAnimatedAndReference(propName: ValidPropNames) {
  return [
    Number(await getTestComponent(ANIMATED_REF).getAnimatedStyle(propName)),
    Number(await getTestComponent(REFERENCE_REF).getAnimatedStyle(propName)),
  ];
}

async function expectSnappedToReference(propName: ValidPropNames) {
  const [animated, reference] = await readAnimatedAndReference(propName);
  expect(animated).toBeWithinRange(
    reference - SNAP_TOLERANCE,
    reference + SNAP_TOLERANCE
  );
}

async function expectMidFlight(propName: ValidPropNames) {
  const [animated, reference] = await readAnimatedAndReference(propName);
  expect(animated).not.toBeWithinRange(
    reference - SNAP_TOLERANCE,
    reference + SNAP_TOLERANCE
  );
}

function DeselectionTest({
  style,
  transitionProperty,
}: {
  style: ViewStyle;
  transitionProperty: Array<TransitionProperty>;
}) {
  const animatedRef = useTestRef(ANIMATED_REF);
  const referenceRef = useTestRef(REFERENCE_REF);

  return (
    <View>
      <View style={styles.slot}>
        <Animated.View
          ref={animatedRef}
          style={[
            styles.box,
            style,
            { ...TRANSITION_SETTINGS, transitionProperty },
          ]}
        />
      </View>
      <View style={styles.slot}>
        <Animated.View ref={referenceRef} style={[styles.box, style]} />
      </View>
      {/* The label changes together with transitionProperty, so that render
          commits a host update like the control changing the property does in
          an app. On iOS only such a commit restores the committed value of a
          property that left the transition. */}
      <Text>{`transitionProperty: ${transitionProperty.join(', ')}`}</Text>
    </View>
  );
}

describe('CSS transition property deselection', () => {
  test.each(CASES)(
    'snaps a property ${name} once it leaves transitionProperty mid-flight',
    async ({ initialStyle, observedProp, targetStyle, transitionProperty }) => {
      await render(
        <DeselectionTest
          style={initialStyle}
          transitionProperty={transitionProperty}
        />
      );
      await render(
        <DeselectionTest
          style={targetStyle}
          transitionProperty={transitionProperty}
        />
      );
      await wait(200);
      await expectMidFlight(observedProp);
      await expectMidFlight('width');

      // Same style, only the deselected property changes.
      await render(
        <DeselectionTest style={targetStyle} transitionProperty={['width']} />
      );
      await wait(100);
      await expectSnappedToReference(observedProp);
      // Negative control: the property that stayed selected is still animating.
      await expectMidFlight('width');

      await wait(1000);
      await expectSnappedToReference('width');
      await expectSnappedToReference(observedProp);
    }
  );
});

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'royalblue',
    height: 40,
  },
  slot: {
    height: 160,
    marginBottom: 20,
  },
});
