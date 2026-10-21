import type { ComponentRef } from 'react';
import { forwardRef, useEffect } from 'react';
import type { ViewProps, ViewStyle } from 'react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  DynamicColorIOS,
  PlatformColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import type { ValidPropNames } from '../../../ReJest/types';
import { ComparisonMode } from '../../../ReJest/types';

// With FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS, Reanimated re-renders a view
// with its settled animated values (`settledStyle`) and drops them from the
// native registry. After that, a React render that has nothing to do with the
// animation must keep the view as it is, instead of going back to the style
// React knows. syncBackToReact.test.tsx checks that React receives values it can
// process; this file checks that they survive the next render.
//
// Each case animates one view with one useAnimatedStyle, like the boxes on the
// sync back example screen. The shared value is toggled without a React render,
// like the screen's "Toggle shared value" button, and the scenario then
// re-renders with a new counter, like "Increase counter".
//
// Readers: `prop` is read from the shadow tree (getAnimatedStyle). transform and
// filter cannot be read from native, so for every case the test also compares
// the style React passes to the view.

const BOX_REF = 'SYNC_BACK_RERENDER_BOX';

// Native sets a view to settled after SETTLED_ANIMATION_THRESHOLD_MS (1000 ms)
// without a new value, PropsRegistryGarbageCollector reads the settled views
// every FLUSH_INTERVAL_MS (500 ms), and React then renders the view. Same value
// as in syncBackToReact.test.tsx; change both if the constants change.
const SYNC_BACK_DELAY_MS = 2000;
// The re-render is committed in a frame or two; the rest is slack.
const RERENDER_FRAMES = 5;

const WIDTH_OFF = 50;
const WIDTH_ON = 150;

// The style React passed to the view in its last render. Box writes it during
// render, on the JS thread, so it is up to date when render() resolves.
let lastReactStyle: ViewStyle = {};
let toggleSharedValue: () => void = () => {};

const Box = forwardRef<ComponentRef<typeof View>, ViewProps>((props, ref) => {
  lastReactStyle = StyleSheet.flatten(props.style) ?? {};
  return <View ref={ref} collapsable={false} {...props} />;
});

const AnimatedBox = Animated.createAnimatedComponent(Box);

function Scenario({
  counter,
  getStyle,
}: {
  counter: number;
  getStyle: (on: boolean) => ViewStyle;
}) {
  const ref = useTestRef(BOX_REF);
  const sv = useSharedValue(false);

  useEffect(() => {
    toggleSharedValue = () => {
      sv.value = !sv.value;
    };
  }, [sv]);

  const animatedStyle = useAnimatedStyle(() => getStyle(sv.value));

  return (
    <View style={styles.container}>
      <AnimatedBox ref={ref} style={[styles.box, animatedStyle]} />
      <Text>Counter: {counter}</Text>
    </View>
  );
}

type Case = {
  description: string;
  getStyle: (on: boolean) => ViewStyle;
  // Read from the shadow tree when the harness can read it.
  prop?: ValidPropNames;
  // The value `prop` must have after the toggle, when it is known in advance.
  target?: number | string;
  mode?: ComparisonMode;
};

const cases: Case[] = [
  {
    description: 'width animated with withSpring',
    getStyle: (on) => {
      'worklet';
      return { width: withSpring(on ? WIDTH_ON : WIDTH_OFF) };
    },
    prop: 'width',
    target: WIDTH_ON,
    mode: ComparisonMode.PIXEL,
  },
  {
    description: 'backgroundColor',
    getStyle: (on) => {
      'worklet';
      return { backgroundColor: on ? 'blue' : 'green' };
    },
    prop: 'backgroundColor',
    target: 'blue',
    mode: ComparisonMode.COLOR,
  },
  {
    description: 'transparent backgroundColor',
    getStyle: (on) => {
      'worklet';
      return { backgroundColor: on ? 'transparent' : 'green' };
    },
    prop: 'backgroundColor',
    target: 'transparent',
    mode: ComparisonMode.COLOR,
  },
  {
    description: 'PlatformColor backgroundColor',
    getStyle: (on) => {
      'worklet';
      return {
        backgroundColor:
          Platform.OS === 'android'
            ? PlatformColor(
                on
                  ? '@android:color/holo_blue_bright'
                  : '@android:color/holo_green_light'
              )
            : PlatformColor(on ? 'systemBlue' : 'systemGreen'),
      };
    },
    // The resolved color depends on the platform and the appearance, so the
    // test only checks that it changed and then stays.
    prop: 'backgroundColor',
  },
  {
    description: 'DynamicColorIOS backgroundColor',
    getStyle: (on) => {
      'worklet';
      return {
        backgroundColor:
          Platform.OS === 'ios'
            ? on
              ? DynamicColorIOS({ light: 'blue', dark: 'orange' })
              : DynamicColorIOS({ light: 'green', dark: 'red' })
            : on
              ? 'blue'
              : 'green',
      };
    },
    prop: 'backgroundColor',
  },
  {
    description: 'boxShadow',
    getStyle: (on) => {
      'worklet';
      return {
        boxShadow: [
          {
            blurRadius: 10,
            offsetX: 10,
            offsetY: 10,
            color: on ? 'blue' : 'green',
          },
        ],
      };
    },
    prop: 'boxShadow',
  },
  {
    description: 'transform',
    getStyle: (on) => {
      'worklet';
      return { transform: `rotate(${on ? 30 : 0}deg)` };
    },
  },
  {
    description: 'filter',
    getStyle: (on) => {
      'worklet';
      return { filter: `brightness(${on ? 0.5 : 1})` };
    },
  },
];

async function readProp(prop: ValidPropNames) {
  return getTestComponent(BOX_REF).getAnimatedStyle(prop);
}

describe('sync of settled props back to React, then a React render', () => {
  test.each(cases)(
    'a React render after the sync keeps the settled ${description}',
    async ({ getStyle, prop, target, mode }) => {
      await render(<Scenario counter={0} getStyle={getStyle} />);
      const reactStyleBefore = JSON.stringify(lastReactStyle);
      const nativeBefore = prop ? await readProp(prop) : undefined;

      // "Toggle shared value": no React render.
      toggleSharedValue();
      if (prop && target !== undefined) {
        await expectEventually(async () =>
          mode === ComparisonMode.PIXEL
            ? Number(await readProp(prop))
            : await readProp(prop)
        ).toBe(target, mode);
      }
      await wait(SYNC_BACK_DELAY_MS);

      const reactStyleSynced = JSON.stringify(lastReactStyle);
      const nativeSynced = prop ? await readProp(prop) : undefined;
      // React got the settled value, so the next render starts from it.
      expect(reactStyleSynced).not.toBe(
        reactStyleBefore,
        ComparisonMode.STRING
      );
      if (prop) {
        expect(nativeSynced as string).not.toBe(
          nativeBefore as string,
          ComparisonMode.STRING
        );
      }

      // "Increase counter": a React render unrelated to the animation.
      await render(<Scenario counter={1} getStyle={getStyle} />);
      await waitForFrames(RERENDER_FRAMES);

      expect(JSON.stringify(lastReactStyle)).toBe(
        reactStyleSynced,
        ComparisonMode.STRING
      );
      if (prop) {
        expect(await readProp(prop)).toBe(
          nativeSynced as string,
          ComparisonMode.STRING
        );
      }
    }
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  box: {
    width: WIDTH_OFF,
    height: 50,
    backgroundColor: 'black',
  },
});
