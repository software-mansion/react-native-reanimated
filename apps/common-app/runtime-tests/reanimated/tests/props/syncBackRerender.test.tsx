import type { ComponentRef } from 'react';
import { forwardRef, useEffect } from 'react';
import type { ViewProps, ViewStyle } from 'react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  DynamicColorIOS,
  getStaticFeatureFlag,
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
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import type { ValidPropNames } from '../../../ReJest/types';
import { ComparisonMode } from '../../../ReJest/types';
import {
  leakingRegistries,
  NO_LEAKS,
} from '../../../ReJest/utils/registriesLeakCheck';

const BOX_REF = 'SYNC_BACK_RERENDER_BOX';

// Settle threshold (1000 ms) + GC interval (500 ms) + slack for a slow emulator.
const SYNC_BACK_TIMEOUT_MS = 4000;
const RERENDER_FRAMES = 5;

const WIDTH_OFF = 50;
const WIDTH_ON = 150;

let lastReactStyle: ViewStyle = {};
let boxRenderCount = 0;
let toggleSharedValue: () => void = () => {};

const Box = forwardRef<ComponentRef<typeof View>, ViewProps>((props, ref) => {
  lastReactStyle = StyleSheet.flatten(props.style) ?? {};
  boxRenderCount += 1;
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
  prop?: ValidPropNames;
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

async function readProp(prop: ValidPropNames, mode?: ComparisonMode) {
  const value = await getTestComponent(BOX_REF).getAnimatedStyle(prop);
  return mode === ComparisonMode.PIXEL ? Number(value) : value;
}

describe('sync of settled props back to React, then a React render', () => {
  test.each(cases)(
    'a React render after the sync keeps the settled ${description}',
    async ({ getStyle, prop, target, mode = ComparisonMode.STRING }) => {
      if (!getStaticFeatureFlag('FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS')) {
        return;
      }

      await render(<Scenario counter={0} getStyle={getStyle} />);
      const reactStyleBefore = JSON.stringify(lastReactStyle);
      const nativeBefore = prop ? await readProp(prop, mode) : undefined;

      toggleSharedValue();
      let nativeAnimated: number | string | undefined;
      if (prop) {
        if (target !== undefined) {
          await expectEventually(() => readProp(prop, mode)).toBe(target, mode);
        } else {
          await expectEventually(() => readProp(prop, mode)).not.toBe(
            nativeBefore as string,
            mode
          );
        }
        nativeAnimated = await readProp(prop, mode);
      }

      await expectEventually(
        () => JSON.stringify(lastReactStyle),
        SYNC_BACK_TIMEOUT_MS
      ).not.toBe(reactStyleBefore, ComparisonMode.STRING);
      // From here the shadow tree holds only what React passed.
      await expectEventually(leakingRegistries, SYNC_BACK_TIMEOUT_MS).toBe(
        NO_LEAKS
      );
      await waitForFrames(RERENDER_FRAMES);

      const reactStyleSynced = JSON.stringify(lastReactStyle);
      if (prop) {
        expect(await readProp(prop, mode)).toBe(nativeAnimated as string, mode);
      }

      const renderCountBefore = boxRenderCount;
      await render(<Scenario counter={1} getStyle={getStyle} />);
      await waitForFrames(RERENDER_FRAMES);

      expect(boxRenderCount).not.toBe(renderCountBefore);
      expect(JSON.stringify(lastReactStyle)).toBe(
        reactStyleSynced,
        ComparisonMode.STRING
      );
      expect(leakingRegistries()).toBe(NO_LEAKS);
      if (prop) {
        expect(await readProp(prop, mode)).toBe(nativeAnimated as string, mode);
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
