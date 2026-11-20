import type { ComponentProps, ComponentRef, ReactElement } from 'react';
import { forwardRef, useCallback, useEffect } from 'react';
import type { SwitchProps, TextInputProps, ViewProps } from 'react-native';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  recordAnimationUpdates,
  render,
  test,
  useTestRef,
  waitUntilSettled,
} from '../../../ReJest/RuntimeTestsApi';
import type { TestValue } from '../../../ReJest/types';
import { ComparisonMode, isValidPropName } from '../../../ReJest/types';
import { convertDecimalColor } from '../../../ReJest/utils/util';

// Replaces the InlineStylesAndPropsExample screen (#10147, fixed in #10151).
// The screen showed View, Circle, Switch and TextInput twice: once animated
// with useAnimatedStyle/useAnimatedProps, once with a shared value passed
// inline (`style={{ backgroundColor: sv }}`, `value={sv}`). Pressing Toggle
// had to change both copies. Here `toggle()` plays the Toggle button.
//
// - "one path": one component. It must start with the initial value and
//   follow each toggle.
// - "hook and inline together": both copies share one shared value, as on the
//   screen. One toggle must update both.
// - "inline style and prop on one component": not on the screen. A Switch gets
//   `value={sv}` and `style={{ opacity: sv }}`, so #10151's split into style
//   and top-level props runs both halves in one update. Both must apply.
//
// The test checks what JS sends to native for every component. For View it
// also checks the shadow tree and the color on screen. Circle fill, Switch
// value and TextInput text can't be read back from native yet.

const BOX_REF = 'INLINE_STYLES_AND_PROPS_BOX';
const HOOK_REF = 'INLINE_STYLES_AND_PROPS_HOOK';
const INLINE_REF = 'INLINE_STYLES_AND_PROPS_INLINE';
const MIXED_REF = 'INLINE_STYLES_AND_PROPS_MIXED';

const OFF_COLOR = 'red';
const ON_COLOR = 'lime';
const OFF_TEXT = 'false';
const ON_TEXT = 'true';
// Not 0: a fully transparent switch would hide a wrong mount.
const OFF_OPACITY = 0.5;
const ON_OPACITY = 1;

const PATHS = ['hook', 'inline'] as const;

type Kind = 'view' | 'circle' | 'switch' | 'textInput';
type Path = (typeof PATHS)[number];
type ReceivedProps = Record<string, unknown>;

// Each kind animates its own prop.
type KindAndProp =
  | { kind: 'view'; prop: 'backgroundColor' }
  | { kind: 'circle'; prop: 'fill' }
  | { kind: 'switch'; prop: 'value' }
  | { kind: 'textInput'; prop: 'text' };

// `shadowTree` and `mountedView`: also check the shadow tree / screen.
type KindCase = KindAndProp & {
  description: string;
  hookName: string;
  inlineName: string;
  off: TestValue;
  on: TestValue;
  mode: ComparisonMode;
  shadowTree: boolean;
  mountedView: boolean;
};

const KIND_CASES = [
  {
    description: 'View backgroundColor',
    hookName: 'useAnimatedStyle',
    inlineName: 'inline style',
    kind: 'view',
    prop: 'backgroundColor',
    off: OFF_COLOR,
    on: ON_COLOR,
    shadowTree: true,
    mountedView: true,
    mode: ComparisonMode.COLOR,
  },
  {
    description: 'Circle fill',
    hookName: 'useAnimatedProps',
    inlineName: 'inline prop',
    kind: 'circle',
    prop: 'fill',
    off: OFF_COLOR,
    on: ON_COLOR,
    shadowTree: false,
    mountedView: false,
    mode: ComparisonMode.COLOR,
  },
  {
    description: 'Switch value',
    hookName: 'useAnimatedProps',
    inlineName: 'inline prop',
    kind: 'switch',
    prop: 'value',
    off: false,
    on: true,
    shadowTree: false,
    mountedView: false,
    mode: ComparisonMode.AUTO,
  },
  {
    description: 'TextInput text',
    hookName: 'useAnimatedProps',
    inlineName: 'inline prop',
    kind: 'textInput',
    prop: 'text',
    off: OFF_TEXT,
    on: ON_TEXT,
    shadowTree: false,
    mountedView: false,
    mode: ComparisonMode.STRING,
  },
] satisfies Array<KindCase>;

const PATH_CASES = KIND_CASES.flatMap((kindCase) =>
  PATHS.map((path) => ({
    ...kindCase,
    path,
    description: `${kindCase.description}, ${
      path === 'hook' ? kindCase.hookName : kindCase.inlineName
    }`,
  }))
);

// Set by the rendered component, called by the test.
let toggle: (() => void) | null = null;

// Spies record the props React passes to the real component, so the test can
// check the initial value.
type SpyProps = { onProps: (props: ReceivedProps) => void };

const SpyView = forwardRef<ComponentRef<typeof View>, ViewProps & SpyProps>(
  ({ onProps, ...props }, ref) => {
    onProps({ ...props, style: StyleSheet.flatten(props.style) ?? {} });
    return <View ref={ref} {...props} />;
  }
);

const SpyCircle = forwardRef<
  ComponentRef<typeof Circle>,
  ComponentProps<typeof Circle> & SpyProps
>(({ onProps, ...props }, ref) => {
  onProps(props);
  return <Circle ref={ref} {...props} />;
});

const SpySwitch = forwardRef<
  ComponentRef<typeof Switch>,
  SwitchProps & SpyProps
>(({ onProps, ...props }, ref) => {
  onProps(props);
  return <Switch ref={ref} {...props} />;
});

// `text` is the native prop behind TextInput's value.
const SpyTextInput = forwardRef<
  ComponentRef<typeof TextInput>,
  TextInputProps & SpyProps & { text?: string }
>(({ onProps, ...props }, ref) => {
  onProps(props);
  return <TextInput ref={ref} {...props} />;
});

const AnimatedSpyView = Animated.createAnimatedComponent(SpyView);
const AnimatedSpyCircle = Animated.createAnimatedComponent(SpyCircle);
const AnimatedSpySwitch = Animated.createAnimatedComponent(SpySwitch);
const AnimatedSpyTextInput = Animated.createAnimatedComponent(SpyTextInput);
const AnimatedSwitch = Animated.createAnimatedComponent(Switch);

// Flips the shared value without a React render.
function useToggledValues() {
  const value = useSharedValue(false);

  const handleToggle = useCallback(() => {
    value.set((current) => !current);
  }, [value]);

  useEffect(() => {
    toggle = handleToggle;
    return () => {
      toggle = null;
    };
  }, [handleToggle]);

  const colorSv = useDerivedValue(() => (value.value ? ON_COLOR : OFF_COLOR));
  const textSv = useDerivedValue(() => (value.value ? ON_TEXT : OFF_TEXT));

  return { value, colorSv, textSv };
}

type ToggledValues = ReturnType<typeof useToggledValues>;

// One component, animated with the hook or inline. The shared values come
// from the scenario, so two variants can share them.
type VariantProps = {
  path: Path;
  values: ToggledValues;
  refName: string;
  onProps: (props: ReceivedProps) => void;
};

function ViewVariant({ path, values, refName, onProps }: VariantProps) {
  const ref = useTestRef(refName);
  const { colorSv } = values;

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: colorSv.value,
  }));

  return (
    <AnimatedSpyView
      ref={ref}
      collapsable={false}
      onProps={onProps}
      style={
        path === 'hook'
          ? [styles.box, animatedStyle]
          : [styles.box, { backgroundColor: colorSv }]
      }
    />
  );
}

function CircleVariant({ path, values, refName, onProps }: VariantProps) {
  const ref = useTestRef(refName);
  const { colorSv } = values;

  const animatedProps = useAnimatedProps(() => ({ fill: colorSv.value }));

  return (
    <Svg width={60} height={60}>
      {path === 'hook' ? (
        <AnimatedSpyCircle
          ref={ref}
          cx={30}
          cy={30}
          r={25}
          onProps={onProps}
          animatedProps={animatedProps}
        />
      ) : (
        <AnimatedSpyCircle
          ref={ref}
          cx={30}
          cy={30}
          r={25}
          onProps={onProps}
          fill={colorSv}
        />
      )}
    </Svg>
  );
}

// Passes the boolean shared value itself, not a derived value.
function SwitchVariant({ path, values, refName, onProps }: VariantProps) {
  const ref = useTestRef(refName);
  const { value } = values;

  const animatedProps = useAnimatedProps(() => ({ value: value.value }));

  return path === 'hook' ? (
    <AnimatedSpySwitch
      ref={ref}
      onProps={onProps}
      animatedProps={animatedProps}
    />
  ) : (
    <AnimatedSpySwitch ref={ref} onProps={onProps} value={value} />
  );
}

function TextInputVariant({ path, values, refName, onProps }: VariantProps) {
  const ref = useTestRef(refName);
  const { textSv } = values;

  const animatedProps = useAnimatedProps(() => ({
    text: textSv.value,
    defaultValue: textSv.value,
  }));

  return path === 'hook' ? (
    <AnimatedSpyTextInput
      ref={ref}
      editable={false}
      style={styles.input}
      onProps={onProps}
      animatedProps={animatedProps}
    />
  ) : (
    <AnimatedSpyTextInput
      ref={ref}
      editable={false}
      style={styles.input}
      onProps={onProps}
      defaultValue={OFF_TEXT}
      text={textSv}
    />
  );
}

const VARIANTS = {
  view: ViewVariant,
  circle: CircleVariant,
  switch: SwitchVariant,
  textInput: TextInputVariant,
} satisfies Record<Kind, (props: VariantProps) => ReactElement>;

// One component, on one path, with its own shared value.
function SinglePathScenario({
  kind,
  path,
  onProps,
}: {
  kind: Kind;
  path: Path;
  onProps: (props: ReceivedProps) => void;
}) {
  const values = useToggledValues();
  const Variant = VARIANTS[kind];

  return (
    <View style={styles.container}>
      <Variant
        path={path}
        values={values}
        refName={BOX_REF}
        onProps={onProps}
      />
    </View>
  );
}

// The hook and the inline component side by side, driven by one shared value.
function BothPathsScenario({
  kind,
  onProps,
}: {
  kind: Kind;
  onProps: (path: Path, props: ReceivedProps) => void;
}) {
  const values = useToggledValues();
  const Variant = VARIANTS[kind];

  return (
    <View style={styles.container}>
      <Variant
        path="hook"
        values={values}
        refName={HOOK_REF}
        onProps={(props) => onProps('hook', props)}
      />
      <Variant
        path="inline"
        values={values}
        refName={INLINE_REF}
        onProps={(props) => onProps('inline', props)}
      />
    </View>
  );
}

// A Switch with an inline top-level prop and an inline style.
function MixedInlineScenario() {
  const ref = useTestRef(MIXED_REF);
  const { value } = useToggledValues();
  const opacitySv = useDerivedValue(() =>
    value.value ? ON_OPACITY : OFF_OPACITY
  );

  return (
    <View style={styles.container}>
      <AnimatedSwitch ref={ref} value={value} style={{ opacity: opacitySv }} />
    </View>
  );
}

// Colors arrive at native as numbers; convert them back for comparison.
function toComparable(value: unknown, mode: ComparisonMode): TestValue {
  if (typeof value === 'number' && mode === ComparisonMode.COLOR) {
    return convertDecimalColor(value);
  }
  if (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return String(value);
}

// View props are styles; the other kinds take the prop at the top level.
function initialValue(
  kind: Kind,
  prop: string,
  first: ReceivedProps | undefined
): unknown {
  return kind === 'view'
    ? (first?.style as ReceivedProps | undefined)?.[prop]
    : first?.[prop];
}

type Updates = Awaited<ReturnType<typeof recordAnimationUpdates>>;

// Ways to read the value back from native.
function createReaders(updates: Updates, prop: string, mode: ComparisonMode) {
  // Every value of `prop` sent to native, in order, from all views (the
  // recorder can't tell views apart).
  const sentValues = async (): Promise<TestValue[]> => {
    try {
      return (await updates.getUpdates())
        .filter((update) => prop in update)
        .map((update) => toComparable((update as ReceivedProps)[prop], mode));
    } catch {
      // `getUpdates` throws when nothing was recorded yet.
      return [];
    }
  };

  return {
    sentValues,
    // The last value sent. Use only when one component is rendered.
    lastSent: async () => {
      const sent = await sentValues();
      return sent[sent.length - 1] ?? 'nothing sent';
    },
    // The shadow tree. Only View styles can be read there.
    committed: async (refName: string) =>
      isValidPropName(prop)
        ? getTestComponent(refName).getAnimatedStyle(prop)
        : `${prop} is not readable from the shadow tree`,
    // The color on screen. View only.
    mounted: async (refName: string) =>
      (await getTestComponent(refName).getMountedViewProps())
        ?.backgroundColor ?? 'not mounted',
  };
}

describe('inline styles and props, one path', () => {
  test.each(PATH_CASES)(
    '${description} follows the shared value before and after toggles',
    async ({ kind, path, prop, off, on, mode, shadowTree, mountedView }) => {
      const received: ReceivedProps[] = [];
      const updates = await recordAnimationUpdates();
      const { lastSent, committed, mounted } = createReaders(
        updates,
        prop,
        mode
      );

      await render(
        <SinglePathScenario
          kind={kind}
          path={path}
          onProps={(props) => received.push(props)}
        />
      );

      // Before any toggle: what React mounted the component with.
      expect(toComparable(initialValue(kind, prop, received[0]), mode)).toBe(
        off,
        mode
      );
      if (shadowTree) {
        expect(await committed(BOX_REF)).toBe(off, mode);
      }
      if (mountedView) {
        // The platform view can attach a few frames after render.
        await expectEventually(() => mounted(BOX_REF)).toBe(off, mode);
      }

      expect(typeof toggle).toBe('function');
      if (!toggle) {
        // Matchers don't throw, so stop here instead of timing out below.
        return;
      }
      for (const expected of [on, off]) {
        toggle();
        await expectEventually(lastSent).toBe(expected, mode);
        if (shadowTree) {
          await expectEventually(() => committed(BOX_REF)).toBe(expected, mode);
        }
        if (mountedView) {
          await expectEventually(() => mounted(BOX_REF)).toBe(expected, mode);
        }
      }
    }
  );
});

describe('inline styles and props, hook and inline together', () => {
  test.each(KIND_CASES)(
    '${description}: one toggle changes the hook and the inline component together',
    async ({ kind, prop, off, on, mode, shadowTree, mountedView }) => {
      const received: Record<Path, ReceivedProps[]> = { hook: [], inline: [] };
      const updates = await recordAnimationUpdates();
      const { sentValues, committed, mounted } = createReaders(
        updates,
        prop,
        mode
      );

      await render(
        <BothPathsScenario
          kind={kind}
          onProps={(path, props) => received[path].push(props)}
        />
      );

      for (const path of PATHS) {
        expect(
          toComparable(initialValue(kind, prop, received[path][0]), mode)
        ).toBe(off, mode);
      }
      if (mountedView) {
        await expectEventually(() => mounted(HOOK_REF)).toBe(off, mode);
        expect(await mounted(INLINE_REF)).toBe(off, mode);
      }

      expect(typeof toggle).toBe('function');
      if (!toggle) {
        // Matchers don't throw, so stop here instead of timing out below.
        return;
      }
      // A component can send its initial value a few frames after mount.
      // Let that land first, so it isn't counted as a toggle update.
      await waitUntilSettled(async () => (await sentValues()).length, {
        stableFrames: 5,
      });
      for (const expected of [on, off]) {
        const sentBefore = (await sentValues()).length;
        toggle();
        // Expect one update from each component. If the inline path is
        // broken, only the hook's update arrives.
        await expectEventually(
          async () => (await sentValues()).length - sentBefore
        ).toBe(2, ComparisonMode.NUMBER);
        for (const sent of (await sentValues()).slice(sentBefore)) {
          expect(sent).toBe(expected, mode);
        }
        if (shadowTree) {
          await expectEventually(() => committed(HOOK_REF)).toBe(
            expected,
            mode
          );
          expect(await committed(INLINE_REF)).toBe(expected, mode);
        }
        if (mountedView) {
          await expectEventually(() => mounted(HOOK_REF)).toBe(expected, mode);
          expect(await mounted(INLINE_REF)).toBe(expected, mode);
        }
      }
    }
  );
});

describe('inline styles and props, inline style and prop on one component', () => {
  test('Switch with inline value and inline opacity updates both', async () => {
    const updates = await recordAnimationUpdates();
    const value = createReaders(updates, 'value', ComparisonMode.AUTO);
    const opacity = createReaders(
      updates,
      'opacity',
      ComparisonMode.FLOAT_DISTANCE
    );
    const mountedOpacity = async () =>
      (await getTestComponent(MIXED_REF).getMountedViewProps())?.opacity ??
      'not mounted';

    await render(<MixedInlineScenario />);

    expect(await opacity.committed(MIXED_REF)).toBe(
      OFF_OPACITY,
      ComparisonMode.FLOAT_DISTANCE
    );
    await expectEventually(mountedOpacity).toBe(
      OFF_OPACITY,
      ComparisonMode.FLOAT_DISTANCE
    );

    expect(typeof toggle).toBe('function');
    if (!toggle) {
      // Matchers don't throw, so stop here instead of timing out below.
      return;
    }
    for (const [expectedValue, expectedOpacity] of [
      [true, ON_OPACITY],
      [false, OFF_OPACITY],
    ] as const) {
      toggle();
      await expectEventually(value.lastSent).toBe(
        expectedValue,
        ComparisonMode.AUTO
      );
      await expectEventually(opacity.lastSent).toBe(
        expectedOpacity,
        ComparisonMode.FLOAT_DISTANCE
      );
      await expectEventually(() => opacity.committed(MIXED_REF)).toBe(
        expectedOpacity,
        ComparisonMode.FLOAT_DISTANCE
      );
      await expectEventually(mountedOpacity).toBe(
        expectedOpacity,
        ComparisonMode.FLOAT_DISTANCE
      );
    }
  });
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  box: {
    height: 60,
    width: 60,
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    padding: 4,
    textAlign: 'center',
    width: 100,
  },
});
