import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { CSSTransitionProperty } from 'react-native-reanimated';
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

const ANIMATED_REF = 'CSSTransitionRevertAnimated';
const REFERENCE_REF = 'CSSTransitionRevertReference';

const INITIAL_STYLE: ViewStyle = { height: 40, width: 40 };
const TARGET_STYLE: ViewStyle = { height: 120, width: 160 };

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

// Nothing but transitionProperty changes between renders, so the deselect
// render commits no host update; the committed value has to come from the
// native revert.
function RevertTest({
  style,
  transitionProperty,
}: {
  style: ViewStyle;
  transitionProperty: CSSTransitionProperty;
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
            {
              transitionDuration: '1s',
              transitionProperty,
              transitionTimingFunction: 'linear',
            },
          ]}
        />
      </View>
      <View style={styles.slot}>
        <Animated.View ref={referenceRef} style={[styles.box, style]} />
      </View>
    </View>
  );
}

describe('CSS transition property revert', () => {
  test('snaps a deselected property without any other host update', async () => {
    await render(
      <RevertTest
        style={INITIAL_STYLE}
        transitionProperty={['width', 'height']}
      />
    );
    await render(
      <RevertTest
        style={TARGET_STYLE}
        transitionProperty={['width', 'height']}
      />
    );
    await wait(200);
    await expectMidFlight('height');
    await expectMidFlight('width');

    await render(
      <RevertTest style={TARGET_STYLE} transitionProperty={['width']} />
    );
    await wait(100);
    await expectSnappedToReference('height');
    await expectMidFlight('width');

    await wait(1000);
    await expectSnappedToReference('width');
    await expectSnappedToReference('height');
  });

  test('snaps every property when the transition detaches', async () => {
    await render(
      <RevertTest
        style={INITIAL_STYLE}
        transitionProperty={['width', 'height']}
      />
    );
    await render(
      <RevertTest
        style={TARGET_STYLE}
        transitionProperty={['width', 'height']}
      />
    );
    await wait(200);
    await expectMidFlight('height');

    await render(<RevertTest style={TARGET_STYLE} transitionProperty="none" />);
    await wait(100);
    await expectSnappedToReference('height');
    await expectSnappedToReference('width');
  });
});

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'royalblue',
  },
  slot: {
    height: 160,
    marginBottom: 20,
  },
});
