import type { ComponentRef, RefObject } from 'react';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

// Covers AnimatableRefExample.tsx ("Animate inner component"): when the
// component passed to createAnimatedComponent has getAnimatableRef(), animated
// props go to the view it returns, not to the component's root view. The
// example animates the `y` of an inner SVG Rect, which the harness cannot read
// back, so this test animates the opacity of an inner View.

const OUTER_REF = 'ANIMATABLE_REF_OUTER';
const INNER_REF = 'ANIMATABLE_REF_INNER';

const INITIAL_OPACITY = 1;
const FIRST_TARGET_OPACITY = 0.5;
const SECOND_TARGET_OPACITY = 0.2;
const DURATION_MS = 300;

type InnerTargetProps = {
  outerRef: RefObject<ComponentRef<typeof View> | null>;
  innerRef: RefObject<ComponentRef<typeof View> | null>;
  opacity?: number;
};

// Like the example's Switch: the root view is not the one to animate, and the
// animated prop React passes in is forwarded to the inner view.
class InnerTarget extends React.Component<InnerTargetProps> {
  getAnimatableRef() {
    return this.props.innerRef.current;
  }

  render() {
    const { outerRef, innerRef, opacity } = this.props;
    return (
      <View ref={outerRef} collapsable={false} style={styles.outer}>
        <View
          ref={innerRef}
          collapsable={false}
          style={[styles.inner, opacity !== undefined && { opacity }]}
        />
      </View>
    );
  }
}

const AnimatedInnerTarget = Animated.createAnimatedComponent(InnerTarget);

function Scenario({
  target,
  notification,
}: {
  target: number;
  notification: string;
}) {
  const outerRef = useTestRef(OUTER_REF);
  const innerRef = useTestRef(INNER_REF);
  const opacity = useSharedValue(INITIAL_OPACITY);

  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  useEffect(() => {
    opacity.set(
      withTiming(target, { duration: DURATION_MS }, (finished) => {
        if (finished) {
          notify(notification);
        }
      })
    );
  }, [opacity, target, notification]);

  return (
    <View style={styles.container}>
      <AnimatedInnerTarget
        outerRef={outerRef}
        innerRef={innerRef}
        animatedProps={animatedProps}
      />
    </View>
  );
}

async function readOpacity(ref: string) {
  return Number(await getTestComponent(ref).getAnimatedStyle('opacity'));
}

// Reads right after the animation ends: with FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS
// the settled value later reaches the inner view through React props too, so
// polling for longer would pass even when the animated updates go elsewhere.
async function expectOnlyInnerAt(targetOpacity: number) {
  // The last update is committed at the end of the frame it was sent in.
  // Two single-frame waits: waitForFrames(n > 1) crashes the UI frame loop
  // until #10753 lands.
  await waitForFrames();
  await waitForFrames();
  expect(await readOpacity(INNER_REF)).toBe(
    targetOpacity,
    ComparisonMode.FLOAT_DISTANCE
  );
  expect(await readOpacity(OUTER_REF)).toBe(
    INITIAL_OPACITY,
    ComparisonMode.FLOAT_DISTANCE
  );
}

describe('getAnimatableRef', () => {
  test('animated props go to the inner view, also after a React render', async () => {
    await render(
      <Scenario target={FIRST_TARGET_OPACITY} notification="first-done" />
    );
    await waitForNotification('first-done');
    await expectOnlyInnerAt(FIRST_TARGET_OPACITY);

    // The example's button: a new animation and a React render together.
    await render(
      <Scenario target={SECOND_TARGET_OPACITY} notification="second-done" />
    );
    await waitForNotification('second-done');
    await expectOnlyInnerAt(SECOND_TARGET_OPACITY);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    width: 120,
    height: 120,
    backgroundColor: 'black',
  },
  inner: {
    width: 60,
    height: 60,
    backgroundColor: 'red',
  },
});
