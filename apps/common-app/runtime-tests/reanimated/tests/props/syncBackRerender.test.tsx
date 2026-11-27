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
  beforeEach,
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
// Frames for the React commit to be mounted before getViewProp reads it.
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
  // Substrings the synced React style must contain. Used for props that have
  // no native reader.
  reactIncludes?: string[];
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
    reactIncludes: ['30deg'],
  },
  {
    description: 'filter',
    getStyle: (on) => {
      'worklet';
      return { filter: `brightness(${on ? 0.5 : 1})` };
    },
    reactIncludes: ['0.5'],
  },
];

async function readProp(
  prop: ValidPropNames,
  mode?: ComparisonMode
): Promise<number | string> {
  const value = await getTestComponent(BOX_REF).getAnimatedStyle(prop);
  return mode === ComparisonMode.PIXEL ? Number(value) : value;
}

type MountedProp = 'width' | 'backgroundColor';

const MOUNTED_MODES: Record<MountedProp, ComparisonMode> = {
  width: ComparisonMode.PIXEL,
  backgroundColor: ComparisonMode.COLOR,
};

function mountedPropFor(prop?: ValidPropNames): MountedProp | undefined {
  return prop === 'width' || prop === 'backgroundColor' ? prop : undefined;
}

async function readMounted(
  prop: MountedProp
): Promise<number | string | undefined> {
  return (await getTestComponent(BOX_REF).getMountedViewProps())?.[prop];
}

function expectReactStyleIncludes(substrings: string[] = []) {
  const reactStyle = JSON.stringify(lastReactStyle);
  for (const substring of substrings) {
    expect(reactStyle).toInclude(substring);
  }
}

describe('sync of settled props back to React, then a React render', () => {
  beforeEach(() => {
    lastReactStyle = {};
    boxRenderCount = 0;
    toggleSharedValue = () => {};
  });

  test.each(cases)(
    'a React render after the sync keeps the settled ${description}',
    async ({
      getStyle,
      prop,
      target,
      mode = ComparisonMode.STRING,
      reactIncludes,
    }) => {
      await render(<Scenario counter={0} getStyle={getStyle} />);
      const reactStyleBefore = JSON.stringify(lastReactStyle);
      const nativeBefore = prop ? await readProp(prop, mode) : undefined;
      const mountedProp = mountedPropFor(prop);
      let mountedBefore: number | string | undefined;
      if (mountedProp) {
        await waitForFrames();
        mountedBefore = await readMounted(mountedProp);
      }

      toggleSharedValue();
      let nativeAnimated: number | string | undefined;
      if (prop) {
        if (target !== undefined) {
          await expectEventually(() => readProp(prop, mode)).toBe(target, mode);
        } else {
          await expectEventually(() => readProp(prop, mode)).not.toBe(
            nativeBefore,
            mode
          );
        }
        nativeAnimated = await readProp(prop, mode);
      }

      await expectEventually(
        () => JSON.stringify(lastReactStyle),
        SYNC_BACK_TIMEOUT_MS
      ).not.toBe(reactStyleBefore, ComparisonMode.STRING);
      expectReactStyleIncludes(reactIncludes);
      // From here the shadow tree holds only what React passed.
      await expectEventually(leakingRegistries, SYNC_BACK_TIMEOUT_MS).toBe(
        NO_LEAKS
      );
      await waitForFrames(RERENDER_FRAMES);

      const reactStyleSynced = JSON.stringify(lastReactStyle);
      if (prop) {
        expect(await readProp(prop, mode)).toBe(nativeAnimated, mode);
      }
      let mountedSynced: number | string | undefined;
      if (mountedProp) {
        const mountedMode = MOUNTED_MODES[mountedProp];
        if (target !== undefined) {
          await expectEventually(() => readMounted(mountedProp)).toBe(
            target,
            mountedMode
          );
        } else {
          await expectEventually(() => readMounted(mountedProp)).not.toBe(
            mountedBefore,
            mountedMode
          );
        }
        mountedSynced = await readMounted(mountedProp);
      }

      const renderCountBefore = boxRenderCount;
      await render(<Scenario counter={1} getStyle={getStyle} />);
      await waitForFrames(RERENDER_FRAMES);

      expect(boxRenderCount).not.toBe(renderCountBefore);
      expect(JSON.stringify(lastReactStyle)).toBe(
        reactStyleSynced,
        ComparisonMode.STRING
      );
      expectReactStyleIncludes(reactIncludes);
      expect(leakingRegistries()).toBe(NO_LEAKS);
      if (prop) {
        expect(await readProp(prop, mode)).toBe(nativeAnimated, mode);
      }
      if (mountedProp) {
        expect(await readMounted(mountedProp)).toBe(
          mountedSynced,
          MOUNTED_MODES[mountedProp]
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
