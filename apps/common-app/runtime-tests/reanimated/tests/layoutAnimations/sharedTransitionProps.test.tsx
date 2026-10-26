import type { ComponentRef } from 'react';
import { memo } from 'react';
import {
  findNodeHandle,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  getDynamicFeatureFlag,
  getStaticFeatureFlag,
  makeMutable,
  setDynamicFeatureFlag,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { runOnUIAsync } from 'react-native-worklets';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import type { MountedViewProps } from '../../../ReJest/types';
import { ComparisonMode } from '../../../ReJest/types';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const SourceInput = memo(function SourceInput({
  color,
  transition,
}: {
  color: SharedValue<string>;
  transition: SharedTransition;
}) {
  const ref = useTestRef('source');
  const animatedProps = useAnimatedProps(() => ({
    placeholderTextColor: color.value,
  }));
  return (
    <AnimatedTextInput
      ref={ref}
      accessibilityLabel="source input"
      placeholder="source"
      placeholderTextColor="red"
      editable={false}
      animatedProps={animatedProps}
      sharedTransitionTag="props"
      sharedTransitionStyle={transition}
      style={styles.source}
    />
  );
});

function TargetInput({
  transition,
  width,
  label,
}: {
  transition: SharedTransition;
  width?: SharedValue<number>;
  label: string;
}) {
  const ref = useTestRef('target');
  const style = useAnimatedStyle(() => ({ width: width?.value ?? 150 }));
  return (
    <AnimatedTextInput
      ref={ref}
      accessibilityLabel={label}
      placeholder="target"
      placeholderTextColor="red"
      sharedTransitionTag="props"
      sharedTransitionStyle={transition}
      style={[styles.target, style]}
    />
  );
}

function Screens({
  active,
  transition,
  color,
  targetWidth,
  targetLabel = 'target input',
}: {
  active: boolean;
  transition: SharedTransition;
  color: SharedValue<string>;
  targetWidth?: SharedValue<number>;
  targetLabel?: string;
}) {
  return (
    <View style={styles.container}>
      <SharedTransitionBoundary isActive={!active}>
        <SourceInput color={color} transition={transition} />
      </SharedTransitionBoundary>
      {active && (
        <SharedTransitionBoundary isActive>
          <TargetInput
            transition={transition}
            width={targetWidth}
            label={targetLabel}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

function StyleScreens({
  active,
  transition,
  sourceColor,
  sourceTag,
  sample,
}: {
  active: boolean;
  transition: SharedTransition;
  sourceColor?: string;
  sourceTag: number;
  sample: SharedValue<MountedViewProps | null>;
}) {
  const source = useTestRef('style-source');
  return (
    <View style={styles.container}>
      {!active && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            ref={source}
            sharedTransitionTag="style-copy"
            sharedTransitionStyle={transition}
            style={{
              width: 60,
              height: 60,
              ...(sourceColor === undefined
                ? {}
                : { backgroundColor: sourceColor }),
            }}
          />
        </SharedTransitionBoundary>
      )}
      {active && (
        <SharedTransitionBoundary isActive>
          <StyleTarget
            transition={transition}
            sourceTag={sourceTag}
            sample={sample}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

function StyleTarget({
  transition,
  sourceTag,
  sample,
}: {
  transition: SharedTransition;
  sourceTag: number;
  sample: SharedValue<MountedViewProps | null>;
}) {
  const target = useTestRef('style-target');
  const targetTag = useSharedValue(-1);
  useFrameCallback(() => {
    if (sample.value || targetTag.value === -1) return;
    const targetProps = global._obtainMountedViewProps(targetTag.value, false);
    if (!targetProps || (targetProps.opacity > 0 && targetProps.width >= 150))
      return;
    const sourceProps = global._obtainMountedViewProps(sourceTag, false);
    sample.value =
      sourceProps && sourceProps.opacity > 0 ? sourceProps : targetProps;
  });
  return (
    <Animated.View
      ref={(view: ComponentRef<typeof View> | null) => {
        target.current = view;
        targetTag.value = findNodeHandle(view) ?? -1;
      }}
      sharedTransitionTag="style-copy"
      sharedTransitionStyle={transition}
      style={{
        marginTop: 100,
        width: 150,
        height: 150,
        backgroundColor: '#2277dd',
      }}
    />
  );
}

function transitionWithNotification() {
  return SharedTransition.duration(1500).withCallback((finished) => {
    'worklet';
    if (finished) {
      notify('props-finished');
    }
  });
}

async function expectSourceMoving() {
  await expectEventually(async () => {
    const props = await getTestComponent('source').getMountedViewProps();
    return (
      !!props && props.opacity > 0 && props.width > 65 && props.width < 145
    );
  }).toBe(true);
}

async function expectBlueHint() {
  await expectEventually(
    async () =>
      (await getTestComponent('source').getTextInputObservation())
        ?.placeholderTextColor
  ).toBe('blue', ComparisonMode.COLOR);
}

describe('Shared transition keeps the moving view props', () => {
  const nativeTest = RuntimeTestObserver ? test : test.skip;

  test.each([
    ['copies the source color', '#dd5522'],
    ['clears a color missing from the source', undefined],
  ] as const)('${0} when React removes the source', async ([, sourceColor]) => {
    const transition = SharedTransition.duration(1200)
      .easing((progress) => {
        'worklet';
        return progress < 0.6 ? 0 : (progress - 0.6) / 0.4;
      })
      .withCallback((finished) => {
        'worklet';
        if (finished) notify('style-copy-finished');
      });
    const sample = makeMutable<MountedViewProps | null>(null);
    const props = { transition, sourceColor, sample };
    await render(<StyleScreens {...props} sourceTag={-1} active={false} />);
    await waitForFrames();
    const sourceTag = getTestComponent('style-source').getTag();
    const original =
      await getTestComponent('style-source').getMountedViewProps();
    expect(original).not.toBe(null);
    await render(<StyleScreens {...props} sourceTag={sourceTag} active />);
    await expectEventually(() => sample.value !== null).toBe(true);
    const moving = sample.value;
    expect(moving).not.toBe(null);
    expect(moving?.width).toBe(60, ComparisonMode.PIXEL);
    expect(moving?.backgroundColor).toBe(
      original?.backgroundColor,
      ComparisonMode.COLOR
    );
    await waitForNotification('style-copy-finished');
    await expectEventually(
      async () =>
        (await getTestComponent('style-target').getMountedViewProps())
          ?.backgroundColor
    ).toBe('#2277dd', ComparisonMode.COLOR);
  });

  nativeTest(
    'keeps each native content label during the move and on return',
    async () => {
      const transition = transitionWithNotification();
      const color = makeMutable('red');
      await render(
        <Screens active={false} transition={transition} color={color} />
      );
      await waitForFrames();
      await render(<Screens active transition={transition} color={color} />);
      await expectSourceMoving();
      expect(
        (await getTestComponent('source').getTextInputObservation())
          ?.accessibilityLabel
      ).toBe('source input');
      expect(
        (await getTestComponent('target').getTextInputObservation())
          ?.accessibilityLabel
      ).toBe('target input');

      await waitForNotification('props-finished');
      expect(
        (await getTestComponent('source').getTextInputObservation())
          ?.accessibilityLabel
      ).toBe('source input');
      expect(
        (await getTestComponent('target').getTextInputObservation())
          ?.accessibilityLabel
      ).toBe('target input');
    }
  );
  test('keeps unchanged native content props while React changes the hidden target', async () => {
    const transition = transitionWithNotification();
    const color = makeMutable('red');
    await render(
      <Screens active={false} transition={transition} color={color} />
    );
    await waitForFrames();
    await render(<Screens active transition={transition} color={color} />);
    await expectSourceMoving();
    await waitForFrames(3);
    expect(
      (await getTestComponent('source').getTextInputObservation())
        ?.accessibilityLabel
    ).toBe('source input');
    expect(
      (await getTestComponent('target').getTextInputObservation())
        ?.accessibilityLabel
    ).toBe('target input');

    await render(
      <Screens
        active
        transition={transition}
        color={color}
        targetLabel="updated target"
      />
    );
    await waitForFrames(3);
    expect(
      (await getTestComponent('target').getMountedViewProps())?.opacity
    ).toBe(0);
    await waitForNotification('props-finished');
    await expectEventually(
      async () =>
        (await getTestComponent('target').getTextInputObservation())
          ?.accessibilityLabel
    ).toBe('updated target');
    expect(
      (await getTestComponent('source').getTextInputObservation())
        ?.accessibilityLabel
    ).toBe('source input');
  });

  const syncTest =
    RuntimeTestObserver &&
    Platform.OS === 'android' &&
    getStaticFeatureFlag('ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS') &&
    !getStaticFeatureFlag('USE_ANIMATION_BACKEND')
      ? test
      : test.skip;

  syncTest.each([[false], [true]] as const)(
    'keeps a synchronous hint color when the target changes, tracking=${0}',
    async ([tracking]) => {
      const flag = 'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS';
      const previous = getDynamicFeatureFlag(flag);
      setDynamicFeatureFlag(flag, tracking);
      try {
        const color = makeMutable('red');
        const width = makeMutable(150);
        const transition = transitionWithNotification();
        await render(
          <Screens
            active={false}
            transition={transition}
            color={color}
            targetWidth={width}
          />
        );
        await waitForFrames();
        await render(
          <Screens
            active
            transition={transition}
            color={color}
            targetWidth={width}
          />
        );
        await expectSourceMoving();
        await runOnUIAsync(() => {
          color.value = 'blue';
        });
        await expectBlueHint();

        await runOnUIAsync(() => {
          width.value = 180;
        });
        for (let frame = 0; frame < 12; frame++) {
          await waitForFrames();
          expect(
            (await getTestComponent('source').getTextInputObservation())
              ?.placeholderTextColor
          ).toBe('blue', ComparisonMode.COLOR);
        }
        await waitForNotification('props-finished');
        await expectEventually(
          async () =>
            (await getTestComponent('source').getMountedViewProps())?.opacity
        ).toBe(0);
        await expectBlueHint();
        await expectEventually(
          async () =>
            (await getTestComponent('target').getMountedViewProps())?.width
        ).toBe(180, ComparisonMode.PIXEL);
      } finally {
        setDynamicFeatureFlag(flag, previous);
      }
    }
  );
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  source: { width: 60, height: 60, backgroundColor: '#dd5522' },
  target: {
    marginTop: 100,
    width: 150,
    height: 150,
    backgroundColor: '#2277dd',
  },
});
