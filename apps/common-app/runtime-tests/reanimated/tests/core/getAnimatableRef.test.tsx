import type { ComponentRef, RefObject } from 'react';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Rect, Svg } from 'react-native-svg';

import {
  describe,
  expect,
  getTestComponent,
  notify,
  recordAnimationUpdates,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

// Covers AnimatableRefExample.tsx ("Animate inner component"): when the
// component passed to createAnimatedComponent has getAnimatableRef(), animated
// props go to the view it returns, not to the component's root view.
//
// - "inner View" checks the routing: the harness can read opacity back from
//   both views, so it can tell which one the animated props reached.
// - "SVG Rect" runs the example's Switch as it is. The harness cannot read the
//   Rect's `y` back from native and records updates without a view tag, so it
//   checks only the `y` values sent through _updateProps.

describe('getAnimatableRef', () => {
  describe('inner View', () => {
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

    // Like the example's Switch: the root view is not the one to animate, and
    // the animated prop React passes in is forwarded to the inner view.
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

      const animatedProps = useAnimatedProps(() => ({
        opacity: opacity.value,
      }));

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
    // the settled value later reaches the inner view through React props too,
    // so polling for longer would pass even when the animated updates go elsewhere.
    async function expectOnlyInnerAt(targetOpacity: number) {
      // The last update is committed at the end of the frame it was sent in.
      await waitForFrames(2);
      expect(await readOpacity(INNER_REF)).toBe(
        targetOpacity,
        ComparisonMode.FLOAT_DISTANCE
      );
      expect(await readOpacity(OUTER_REF)).toBe(
        INITIAL_OPACITY,
        ComparisonMode.FLOAT_DISTANCE
      );
    }

    test('animated props go to the inner view, also after a React render', async () => {
      await render(
        <Scenario
          target={FIRST_TARGET_OPACITY}
          notification="view-first-done"
        />
      );
      await waitForNotification('view-first-done');
      await expectOnlyInnerAt(FIRST_TARGET_OPACITY);

      // The example's button: a new animation and a React render together.
      await render(
        <Scenario
          target={SECOND_TARGET_OPACITY}
          notification="view-second-done"
        />
      );
      await waitForNotification('view-second-done');
      await expectOnlyInnerAt(SECOND_TARGET_OPACITY);
    });
  });

  describe('SVG Rect', () => {
    // Same values as the example: the shared value springs between 0 and 250,
    // and the Rect's `y` is the shared value + 10.
    const Y_OFFSET = 10;
    const DOWN = 250;
    const UP = 0;
    // The default spring takes about 50 frames over this distance.
    const MIN_SPRING_FRAMES = 10;

    type SwitchProps = {
      y?: number;
    };

    // The example's Switch, unchanged.
    class Switch extends React.Component<SwitchProps> {
      rectRef: Rect | null = null;

      getAnimatableRef() {
        return this.rectRef;
      }

      render() {
        return (
          <Svg height="310" width="70">
            <Rect
              x="5"
              y="5"
              width="60"
              height="300"
              fill="none"
              stroke="black"
              strokeWidth={10}
            />
            <Rect
              x="10"
              y={this.props.y}
              width="50"
              height="40"
              fill="red"
              ref={(component) => {
                this.rectRef = component;
              }}
            />
          </Svg>
        );
      }
    }

    const AnimatedSwitch = Animated.createAnimatedComponent(Switch);

    function Scenario({
      target,
      notification,
    }: {
      target: number;
      notification: string;
    }) {
      const sv = useSharedValue(UP);

      const animatedProps = useAnimatedProps(() => ({
        y: sv.value + Y_OFFSET,
      }));

      useEffect(() => {
        sv.set(
          withSpring(target, undefined, (finished) => {
            if (finished) {
              notify(notification);
            }
          })
        );
      }, [sv, target, notification]);

      return (
        <View style={styles.container}>
          <AnimatedSwitch animatedProps={animatedProps} />
        </View>
      );
    }

    test('the Rect y springs down and up, also after a React render', async () => {
      const updatesContainer = await recordAnimationUpdates();

      // "Go down"
      await render(<Scenario target={DOWN} notification="svg-down-done" />);
      await waitForNotification('svg-down-done');

      // "Go up": a new animation and a React render together, as the button does.
      await render(<Scenario target={UP} notification="svg-up-done" />);
      await waitForNotification('svg-up-done');
      await waitForFrames(2);

      // Read once: on main, a second getUpdates() in the same test returns the
      // content of the first read (UpdatesContainer._readRecorded, fixed in #10872).
      // The Switch is the only animated component, so every recorded update
      // with `y` is the Rect's.
      const ys = (await updatesContainer.getUpdates(undefined, ['y']))
        .map((update) => (update as Record<string, unknown>).y)
        .filter((y): y is number => typeof y === 'number');

      // A spring ends exactly at its target, so the first DOWN + Y_OFFSET is
      // the last frame of "Go down".
      const downEnd = ys.indexOf(DOWN + Y_OFFSET);
      const down = ys.slice(0, downEnd + 1);
      const up = ys.slice(downEnd + 1);

      // Each spring sends many frames, not one jump to the target.
      expect(downEnd).toBeWithinRange(
        MIN_SPRING_FRAMES,
        Number.MAX_SAFE_INTEGER
      );
      expect(up.length).toBeWithinRange(
        MIN_SPRING_FRAMES,
        Number.MAX_SAFE_INTEGER
      );
      expect(down[down.length - 1]).toBe(
        DOWN + Y_OFFSET,
        ComparisonMode.FLOAT_DISTANCE
      );
      expect(up[up.length - 1]).toBe(
        UP + Y_OFFSET,
        ComparisonMode.FLOAT_DISTANCE
      );
    });
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
