import type { ComponentRef } from 'react';
import { forwardRef, useEffect } from 'react';
import type {
  BoxShadowValue,
  ScrollViewProps,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  processColor,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SettledUpdate } from 'react-native-reanimated/lib/typescript/commonTypes';
import { createSynchronizable, scheduleOnUI } from 'react-native-worklets';

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
import type { Operation } from '../../../ReJest/types';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const NOTIFICATION_NAME = 'SYNC_BACK_ANIMATION_FINISHED';
// Native sets a view to settled after SETTLED_ANIMATION_THRESHOLD_MS (1000 ms)
// without a new value. PropsRegistryGarbageCollector reads the settled views
// every FLUSH_INTERVAL_MS (500 ms). The maximum delay is 1500 ms. The other
// 500 ms is for the React render after setState and for a slow emulator.
// If you change one of the two constants, change this value.
const SYNC_BACK_DELAY_MS = 2000;
// The value settles and stays settled for 2000 ms while no timer can run.
const JS_THREAD_STALL_MS = 3000;
const LATE_CONTENT_OFFSET_Y = 100;
const SETTLED_OPACITY = 0.5;
const SETTLED_BORDER_RADIUS = 10;
const SECOND_WRITE_NOTIFICATION_NAME = 'SYNC_BACK_SECOND_WRITE_FINISHED';
// React receives the first value after 1700 ms at the most. Native removes the
// settled entry on the next read, 500 ms later. The second write starts after
// that, with a margin for a slow emulator.
const SECOND_WRITE_DELAY_MS = 4000;
const SECOND_WRITE_BORDER_RADIUS = 20;
const SETTLED_BLUR_RADIUS = 8;
// processBoxShadow of Reanimated adds this color when a shadow has none.
const STYLE_BUILDER_DEFAULT_SHADOW_COLOR = '#000000';
const SETTLED_GRADIENT_ANGLE = 225;

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

  test('React receives a settled value after the JS thread was busy for longer than the settle threshold', async () => {
    const [received, setReceived] = createTestValue<ViewStyle>({});
    const getStyle = (progress: number): ViewStyle => {
      'worklet';
      return { opacity: progress };
    };

    await render(
      <SyncBackComponent getStyle={getStyle} onStyle={setReceived} />
    );
    await waitForNotification(NOTIFICATION_NAME);
    blockJSThread(JS_THREAD_STALL_MS);
    await wait(SYNC_BACK_DELAY_MS);

    expect((received.value as ViewStyle).opacity).toBe(1);
  });
});

function blockJSThread(durationMs: number) {
  const end = performance.now() + durationMs;
  let now = performance.now();
  while (now < end) {
    now = performance.now();
  }
}

type StyleBuilderValues = Pick<ViewStyle, 'boxShadow' | 'backgroundImage'>;

type ScrollBoxAnimatedProps = ScrollViewProps &
  StyleBuilderValues & { borderRadius?: number };

type ReceivedProps = {
  props: ScrollBoxAnimatedProps;
  style: ViewStyle;
};

type ScrollBoxProps = ScrollBoxAnimatedProps & {
  onProps: (received: ReceivedProps) => void;
};

const ScrollBox = forwardRef<ComponentRef<typeof ScrollView>, ScrollBoxProps>(
  ({ onProps, ...props }, ref) => {
    onProps({ props, style: StyleSheet.flatten(props.style) ?? {} });
    return <ScrollView ref={ref} {...props} />;
  }
);

const AnimatedScrollBox = Animated.createAnimatedComponent(ScrollBox);

function AnimatedPropsAndStyleComponent({
  onProps,
}: {
  onProps: (received: ReceivedProps) => void;
}) {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, SETTLED_OPACITY]),
    borderRadius: progress.value * SETTLED_BORDER_RADIUS,
  }));
  const animatedProps = useAnimatedProps<ScrollBoxAnimatedProps>(() =>
    progress.value === 0
      ? {}
      : {
          contentOffset: { x: 0, y: progress.value * LATE_CONTENT_OFFSET_Y },
          borderRadius: progress.value * SETTLED_BORDER_RADIUS,
        }
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: 200 }, () => {
      notify(NOTIFICATION_NAME);
    });
  }, [progress]);

  return (
    <View style={styles.container}>
      <AnimatedScrollBox
        animatedProps={animatedProps}
        style={[styles.box, animatedStyle]}
        onProps={onProps}
      />
    </View>
  );
}

async function renderAndWaitForSyncBack() {
  const [received, setReceived] = createTestValue<ReceivedProps>({
    props: {},
    style: {},
  });

  await render(<AnimatedPropsAndStyleComponent onProps={setReceived} />);
  await waitForNotification(NOTIFICATION_NAME);
  await wait(SYNC_BACK_DELAY_MS);

  return received.value as ReceivedProps;
}

describe('sync of settled animated props back to React', () => {
  test('React receives a prop first returned after mount as a top-level prop', async () => {
    const { props, style } = await renderAndWaitForSyncBack();

    expect(props.contentOffset?.y).toBe(LATE_CONTENT_OFFSET_Y);
    expect('contentOffset' in style).toBe(false);
  });

  test('React receives an animated style value only inside style', async () => {
    const { props, style } = await renderAndWaitForSyncBack();

    expect(style.opacity as number).toBe(SETTLED_OPACITY);
    expect('opacity' in props).toBe(false);
  });

  test('React receives a value written by both animated props and animated style as a prop and inside style', async () => {
    const { props, style } = await renderAndWaitForSyncBack();

    expect(props.borderRadius).toBe(SETTLED_BORDER_RADIUS);
    expect(style.borderRadius as number).toBe(SETTLED_BORDER_RADIUS);
  });
});

type WriteOrigin = 'animatedProps' | 'animatedStyle';

function SecondWriteComponent({
  secondWriteOrigin,
  onProps,
}: {
  secondWriteOrigin: WriteOrigin;
  onProps: (received: ReceivedProps) => void;
}) {
  const styleBorderRadius = useSharedValue(0);
  const propsBorderRadius = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderRadius: styleBorderRadius.value,
  }));
  const animatedProps = useAnimatedProps<ScrollBoxAnimatedProps>(() => ({
    borderRadius: propsBorderRadius.value,
  }));

  useEffect(() => {
    styleBorderRadius.value = withTiming(SETTLED_BORDER_RADIUS, {
      duration: 200,
    });
    propsBorderRadius.value = withTiming(SETTLED_BORDER_RADIUS, {
      duration: 200,
    });
    const secondWriteBorderRadius =
      secondWriteOrigin === 'animatedStyle'
        ? styleBorderRadius
        : propsBorderRadius;
    const secondWriteTimeout = setTimeout(() => {
      secondWriteBorderRadius.value = withTiming(
        SECOND_WRITE_BORDER_RADIUS,
        { duration: 200 },
        () => {
          notify(SECOND_WRITE_NOTIFICATION_NAME);
        }
      );
    }, SECOND_WRITE_DELAY_MS);

    return () => clearTimeout(secondWriteTimeout);
  }, [styleBorderRadius, propsBorderRadius, secondWriteOrigin]);

  return (
    <View style={styles.container}>
      <AnimatedScrollBox
        animatedProps={animatedProps}
        style={[styles.box, animatedStyle]}
        onProps={onProps}
      />
    </View>
  );
}

describe('sync of a value written by both origins after native removed the settled entry', () => {
  test.each<WriteOrigin>(['animatedStyle', 'animatedProps'])(
    'React receives a later value written only by %s as a prop and inside style',
    async (secondWriteOrigin) => {
      const [received, setReceived] = createTestValue<ReceivedProps>({
        props: {},
        style: {},
      });

      await render(
        <SecondWriteComponent
          secondWriteOrigin={secondWriteOrigin}
          onProps={setReceived}
        />
      );
      await waitForNotification(SECOND_WRITE_NOTIFICATION_NAME);
      await wait(SYNC_BACK_DELAY_MS);

      const { props, style } = received.value as ReceivedProps;
      expect(props.borderRadius).toBe(SECOND_WRITE_BORDER_RADIUS);
      expect(style.borderRadius as number).toBe(SECOND_WRITE_BORDER_RADIUS);
    }
  );
});

function LastWriteComponent({
  getValues,
  lastWriteOrigin,
  onProps,
}: {
  getValues: (progress: number) => StyleBuilderValues;
  lastWriteOrigin: WriteOrigin;
  onProps: (received: ReceivedProps) => void;
}) {
  const styleProgress = useSharedValue(0);
  const propsProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => getValues(styleProgress.value));
  const animatedProps = useAnimatedProps<ScrollBoxAnimatedProps>(() =>
    getValues(propsProgress.value)
  );

  useEffect(() => {
    const [firstProgress, lastProgress] =
      lastWriteOrigin === 'animatedStyle'
        ? [propsProgress, styleProgress]
        : [styleProgress, propsProgress];
    firstProgress.value = withTiming(1, { duration: 200 }, () => {
      lastProgress.value = withTiming(1, { duration: 200 }, () => {
        notify(NOTIFICATION_NAME);
      });
    });
  }, [styleProgress, propsProgress, lastWriteOrigin]);

  return (
    <View style={styles.container}>
      <AnimatedScrollBox
        animatedProps={animatedProps}
        style={[styles.box, animatedStyle]}
        onProps={onProps}
      />
    </View>
  );
}

async function renderAndWaitForLastWriteSyncBack(
  getValues: (progress: number) => StyleBuilderValues,
  lastWriteOrigin: WriteOrigin
) {
  const [received, setReceived] = createTestValue<ReceivedProps>({
    props: {},
    style: {},
  });

  await render(
    <LastWriteComponent
      getValues={getValues}
      lastWriteOrigin={lastWriteOrigin}
      onProps={setReceived}
    />
  );
  await waitForNotification(NOTIFICATION_NAME);
  await wait(SYNC_BACK_DELAY_MS);

  return received.value as ReceivedProps;
}

// Android throws when `useAnimatedProps` sends a color string in a boxShadow
// or a backgroundImage string to a View. A ScrollView ignores backgroundImage.
function getBoxShadow(progress: number): StyleBuilderValues {
  'worklet';
  return {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: interpolate(progress, [0, 1], [1, SETTLED_BLUR_RADIUS]),
        spreadDistance: 0,
      },
    ],
  };
}

function getBackgroundImage(progress: number): StyleBuilderValues {
  'worklet';
  return {
    backgroundImage: `linear-gradient(${interpolate(progress, [0, 1], [45, SETTLED_GRADIENT_ANGLE])}deg, #ff0000, #0000ff)`,
  };
}

describe('sync of a value that only the style props builder processes, written by both origins', () => {
  test('React receives a boxShadow it can process as a prop and inside style when animatedStyle wrote last', async () => {
    const { props, style } = await renderAndWaitForLastWriteSyncBack(
      getBoxShadow,
      'animatedStyle'
    );

    for (const boxShadow of [props.boxShadow, style.boxShadow]) {
      const [shadow] = boxShadow as BoxShadowValue[];
      expect(shadow.blurRadius as number).toBe(SETTLED_BLUR_RADIUS);
      expect(typeof shadow.color).toBe('string');
      expect(shadow.color as string).toBe(
        STYLE_BUILDER_DEFAULT_SHADOW_COLOR,
        ComparisonMode.COLOR
      );
    }
  });

  test('React receives a boxShadow unchanged as a prop and inside style when animatedProps wrote last', async () => {
    const { props, style } = await renderAndWaitForLastWriteSyncBack(
      getBoxShadow,
      'animatedProps'
    );

    for (const boxShadow of [props.boxShadow, style.boxShadow]) {
      const [shadow] = boxShadow as BoxShadowValue[];
      expect(shadow.blurRadius as number).toBe(SETTLED_BLUR_RADIUS);
      expect('color' in shadow).toBe(false);
    }
  });

  test('React receives a backgroundImage it can process as a prop and inside style when animatedStyle wrote last', async () => {
    const { props, style } = await renderAndWaitForLastWriteSyncBack(
      getBackgroundImage,
      'animatedStyle'
    );

    for (const backgroundImage of [
      props.backgroundImage,
      style.backgroundImage,
    ]) {
      expect(Array.isArray(backgroundImage)).toBe(true);
      const [linear] = backgroundImage as Gradient[];
      expect((linear as { direction?: string }).direction as string).toBe(
        `${SETTLED_GRADIENT_ANGLE}deg`
      );
      expect(typeof linear.colorStops[0].color).toBe('string');
    }
  });

  test('React receives a backgroundImage unchanged as a prop and inside style when animatedProps wrote last', async () => {
    const { props, style } = await renderAndWaitForLastWriteSyncBack(
      getBackgroundImage,
      'animatedProps'
    );

    const settledBackgroundImage = getBackgroundImage(1).backgroundImage;
    expect(props.backgroundImage as string).toBe(
      settledBackgroundImage as string
    );
    expect(style.backgroundImage as string).toBe(
      settledBackgroundImage as string
    );
  });
});

function PendingWriteComponent({
  onReady,
}: {
  onReady: (
    shadowNodeWrapper: NonNullable<Operation['shadowNodeWrapper']>,
    tag: number
  ) => void;
}) {
  const ref = useAnimatedRef<ComponentRef<typeof ScrollView>>();

  useEffect(() => {
    onReady(
      ref() as NonNullable<Operation['shadowNodeWrapper']>,
      ref.getTag!()!
    );
  }, [onReady, ref]);

  return <Animated.ScrollView ref={ref} style={styles.box} />;
}

describe('sync of a pending value written by a different origin', () => {
  test.each<WriteOrigin>(['animatedStyle', 'animatedProps'])(
    'defers the snapshot until the pending %s write reaches the registry',
    async (lastWriteOrigin) => {
      let shadowNodeWrapper: NonNullable<Operation['shadowNodeWrapper']>;
      let tag = -1;
      await render(
        <PendingWriteComponent
          onReady={(wrapper, viewTag) => {
            shadowNodeWrapper = wrapper;
            tag = viewTag;
          }}
        />
      );
      const written = createSynchronizable(false);
      const released = createSynchronizable(false);
      const lastWriteIsStyle = lastWriteOrigin === 'animatedStyle';

      try {
        await runOnUIBlocking(() => {
          'worklet';
          const values = getNativeBoxShadow(0, !lastWriteIsStyle);
          global._updateProps([
            {
              name: 'ScrollView',
              shadowNodeWrapper,
              updates: values,
              isAnimatedProps: lastWriteIsStyle,
            },
          ]);
          global._maybeFlushUIUpdatesQueue();
        });
        blockJSThread(SYNC_BACK_DELAY_MS);
        const firstUpdate = getSettledUpdates(tag).find(
          (update) => update.viewTag === tag
        );
        expect(firstUpdate !== undefined).toBe(true);

        scheduleOnUI(() => {
          'worklet';
          const values = getNativeBoxShadow(1, lastWriteIsStyle);
          global._updateProps([
            {
              name: 'ScrollView',
              shadowNodeWrapper,
              updates: values,
              isAnimatedProps: !lastWriteIsStyle,
            },
          ]);
          written.setBlocking(true);
          const deadline = performance.now() + 5000;
          while (!released.getBlocking() && performance.now() < deadline) {
            // Keep the pending batch on the UI thread until JS reads it.
          }
          global._maybeFlushUIUpdatesQueue();
        });
        await Promise.resolve();
        const deadline = performance.now() + 3000;
        while (!written.getBlocking() && performance.now() < deadline) {
          // Keep the automatic sync timer from reading the registry.
        }
        expect(written.getBlocking()).toBe(true);
        const pendingUpdates = getSettledUpdates(tag).filter(
          (update) => update.viewTag === tag
        );
        released.setBlocking(true);

        expect(pendingUpdates.length).toBe(0);
        const flushDeadline = performance.now() + 3000;
        let flushedUpdate: SettledUpdate | undefined;
        do {
          flushedUpdate = getSettledUpdates(tag).find(
            (update) => update.viewTag === tag
          );
        } while (!flushedUpdate && performance.now() < flushDeadline);
        expect(flushedUpdate !== undefined).toBe(true);
        if (flushedUpdate) {
          expect(
            flushedUpdate.keysLastWrittenByAnimatedStyle.includes('boxShadow')
          ).toBe(lastWriteIsStyle);
          for (const values of [flushedUpdate.props, flushedUpdate.style]) {
            const [shadow] = values.boxShadow as BoxShadowValue[];
            expect(shadow.blurRadius as number).toBe(SETTLED_BLUR_RADIUS);
            expect('color' in shadow).toBe(lastWriteIsStyle);
            if (lastWriteIsStyle) {
              expect(typeof shadow.color).toBe('number');
            }
          }
        }
      } finally {
        released.setBlocking(true);
        await runOnUIBlocking(() => {
          'worklet';
          global._maybeFlushUIUpdatesQueue();
        });
      }
    }
  );
});

function getSettledUpdates(tag: number): SettledUpdate[] {
  return (
    global.__reanimatedModuleProxy.getSettledUpdates as (
      registeredViewTags: number[]
    ) => SettledUpdate[]
  )([tag]);
}

function getNativeBoxShadow(progress: number, isAnimatedStyle: boolean) {
  'worklet';
  const shadow = {
    offsetX: 0,
    offsetY: 4,
    blurRadius: interpolate(progress, [0, 1], [1, SETTLED_BLUR_RADIUS]),
    spreadDistance: 0,
  };
  return {
    boxShadow: [
      isAnimatedStyle
        ? { ...shadow, color: processColor(STYLE_BUILDER_DEFAULT_SHADOW_COLOR) }
        : shadow,
    ],
  };
}

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
