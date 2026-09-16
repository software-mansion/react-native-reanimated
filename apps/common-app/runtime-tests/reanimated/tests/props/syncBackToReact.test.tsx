import type { ComponentRef } from 'react';
import { forwardRef, useEffect } from 'react';
import type { BoxShadowValue, ViewProps, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  createTestValue,
  describe,
  expect,
  notify,
  render,
  test,
  wait,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const NOTIFICATION_NAME = 'SYNC_BACK_ANIMATION_FINISHED';
// Native sets a view to settled after SETTLED_ANIMATION_THRESHOLD_MS (1000 ms)
// without a new value. PropsRegistryGarbageCollector reads the settled views
// every FLUSH_INTERVAL_MS (500 ms). The maximum delay is 1500 ms. The other
// 500 ms is for the React render after setState and for a slow emulator.
// If you change one of the two constants, change this value.
const SYNC_BACK_DELAY_MS = 2000;

type Gradient = Exclude<
  NonNullable<ViewStyle['backgroundImage']>,
  string
>[number];

type BoxProps = ViewProps & {
  onStyle: (style: ViewStyle) => void;
};

const Box = forwardRef<ComponentRef<typeof View>, BoxProps>(
  ({ onStyle, ...props }, ref) => {
    onStyle(StyleSheet.flatten(props.style) ?? {});
    return <View ref={ref} {...props} />;
  }
);

const AnimatedBox = Animated.createAnimatedComponent(Box);

function SyncBackComponent({
  getStyle,
  onStyle,
}: {
  getStyle: (progress: number) => ViewStyle;
  onStyle: (style: ViewStyle) => void;
}) {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => getStyle(progress.value));

  useEffect(() => {
    progress.value = withTiming(1, { duration: 200 }, () => {
      notify(NOTIFICATION_NAME);
    });
  }, [progress]);

  return (
    <View style={styles.container}>
      <AnimatedBox style={[styles.box, animatedStyle]} onStyle={onStyle} />
    </View>
  );
}

describe('sync of settled props back to React', () => {
  test.each([
    {
      description: 'backgroundColor',
      getStyle: (progress: number): ViewStyle => {
        'worklet';
        return {
          backgroundColor: interpolateColor(
            progress,
            [0, 1],
            ['#ff0000', '#0000ff']
          ),
        };
      },
      check: (style: ViewStyle) => {
        expect(typeof style.backgroundColor).toBe('string');
        expect(style.backgroundColor as string).toBe(
          '#0000ff',
          ComparisonMode.COLOR
        );
      },
    },
    {
      description: 'boxShadow',
      getStyle: (progress: number): ViewStyle => {
        'worklet';
        return {
          boxShadow: [
            {
              offsetX: 0,
              offsetY: 4,
              blurRadius: interpolate(progress, [0, 1], [1, 8]),
              spreadDistance: 0,
              color: '#ff0000',
            },
          ],
        };
      },
      check: (style: ViewStyle) => {
        const [shadow] = style.boxShadow as BoxShadowValue[];
        expect(shadow.blurRadius as number).toBe(8);
        expect(typeof shadow.color).toBe('string');
        expect(shadow.color as string).toBe('#ff0000', ComparisonMode.COLOR);
      },
    },
    {
      description: 'backgroundImage',
      getStyle: (progress: number): ViewStyle => {
        'worklet';
        return {
          backgroundImage:
            `linear-gradient(${interpolate(progress, [0, 1], [45, 225])}deg, #ff0000, 30%, #0000ff 90%), ` +
            'radial-gradient(circle at 30% 50%, #ffffff, #0000ff00 20px)',
        };
      },
      check: (style: ViewStyle) => {
        expect(Array.isArray(style.backgroundImage)).toBe(true);
        const [linear, radial] = style.backgroundImage as [Gradient, Gradient];
        expect(linear.type).toBe('linear-gradient');
        expect(typeof (linear as { direction?: unknown }).direction).toBe(
          'string'
        );
        expect(typeof linear.colorStops[0].color).toBe('string');
        expect(radial.type).toBe('radial-gradient');
      },
    },
  ])(
    'React receives a ${description} it can process after the animation settles',
    async ({ getStyle, check }) => {
      const [received, setReceived] = createTestValue<ViewStyle>({});

      await render(
        <SyncBackComponent getStyle={getStyle} onStyle={setReceived} />
      );
      await waitForNotification(NOTIFICATION_NAME);
      await wait(SYNC_BACK_DELAY_MS);

      check(received.value as ViewStyle);
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
    height: 100,
    width: 100,
  },
});
