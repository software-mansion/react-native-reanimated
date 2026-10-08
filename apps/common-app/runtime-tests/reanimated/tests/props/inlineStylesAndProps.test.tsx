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
} from '../../../ReJest/RuntimeTestsApi';
import type { TestValue } from '../../../ReJest/types';
import { ComparisonMode, isValidPropName } from '../../../ReJest/types';
import { convertDecimalColor } from '../../../ReJest/utils/util';

// Covers InlineStylesAndPropsExample.tsx: a shared value passed inline, as a
// style value or as a top-level prop, must reach native like the same value
// passed through useAnimatedStyle or useAnimatedProps (#10147, fixed in
// #10151). Each case renders one component and toggles a boolean shared value
// with `sv.set`, as the example's Toggle button does, so no React render is
// involved in the update.
//
// Update path: with the runtime-tests flags (`*_SYNCHRONOUSLY_UPDATE_UI_PROPS`
// off), every case goes through `_updateProps` and the ShadowTree commit.
//
// What each case reads:
//
// | Case                 | Initial (React props) | Updates (`_updateProps`) | Shadow tree      | Mounted view        |
// | -------------------- | --------------------- | ------------------------ | ---------------- | ------------------- |
// | View backgroundColor | spy                   | recorder                 | getAnimatedStyle | -                   |
// | View opacity         | spy                   | recorder                 | getAnimatedStyle | getMountedViewProps |
// | Circle fill          | spy                   | recorder                 | -                | -                   |
// | Switch value         | spy                   | recorder                 | -                | -                   |
// | TextInput text       | spy                   | recorder                 | -                | -                   |
//
// The opacity cases are not on the example screen. Opacity takes the same
// path as backgroundColor (a non-layout style prop through the commit), and
// `getMountedViewProps` (#10739) can read it from the platform view (`alpha`),
// so these cases check the inline style path up to what the platform shows.
// It returns only frame and opacity, so for backgroundColor, fill, value and
// text the test stops at the shadow tree or at what JS sent to native, which
// is where #10147 broke. SVG opacity is drawn by the parent Svg, not set on a
// platform view, so it cannot replace fill.
// TODO: check backgroundColor, Switch state and text on the mounted view once
// `_obtainMountedViewProps` returns them.

const BOX_REF = 'INLINE_STYLES_AND_PROPS_BOX';

const OFF_COLOR = 'red';
const ON_COLOR = 'lime';
// Not 0: a fully transparent view would hide a wrong mount.
const OFF_OPACITY = 0.5;
const ON_OPACITY = 1;
const OFF_TEXT = 'false';
const ON_TEXT = 'true';

type Kind = 'view' | 'circle' | 'switch' | 'textInput';
type Path = 'hook' | 'inline';
type ReceivedProps = Record<string, unknown>;

// Each kind animates its own prop, so a row cannot pair a kind with a prop it
// does not render.
type KindAndProp =
  | { kind: 'view'; prop: 'backgroundColor' | 'opacity' }
  | { kind: 'circle'; prop: 'fill' }
  | { kind: 'switch'; prop: 'value' }
  | { kind: 'textInput'; prop: 'text' };
type Prop = KindAndProp['prop'];

// `shadowTree` and `mountedView` say which native layers the row reads, as in
// the table above. Every row reads the spy and the recorder.
type Case = KindAndProp & {
  description: string;
  path: Path;
  off: TestValue;
  on: TestValue;
  mode: ComparisonMode;
  shadowTree: boolean;
  mountedView: boolean;
};

// Set by the rendered component, called by the test.
let toggle: (() => void) | null = null;

// Spies record the props React gives the host component. On the first render
// they hold the initial value of each path: `initial` of the hook, or
// `sv.value` for an inline shared value (PropsFilter).
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

// `text` is the native prop backing TextInput's value. It is declared here
// because the wrapper forwards it, so it types like any other prop.
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

type ScenarioProps = {
  path: Path;
  prop: Prop;
  onProps: (props: ReceivedProps) => void;
};

// The example's Toggle button: flips the shared value without a React render.
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
  const opacitySv = useDerivedValue(() =>
    value.value ? ON_OPACITY : OFF_OPACITY
  );
  const textSv = useDerivedValue(() => (value.value ? ON_TEXT : OFF_TEXT));

  return { value, colorSv, opacitySv, textSv };
}

// Only this scenario registers the test ref: `render` waits for every
// registered ref to mount, and the other scenarios do not read it. One box
// animates one style prop, backgroundColor or opacity.
function ViewScenario({ path, prop, onProps }: ScenarioProps) {
  const ref = useTestRef(BOX_REF);
  const { colorSv, opacitySv } = useToggledValues();
  const isOpacity = prop === 'opacity';

  const animatedStyle = useAnimatedStyle(() =>
    isOpacity
      ? { opacity: opacitySv.value }
      : { backgroundColor: colorSv.value }
  );
  const inlineStyle = isOpacity
    ? { opacity: opacitySv }
    : { backgroundColor: colorSv };

  return (
    <View style={styles.container}>
      <AnimatedSpyView
        ref={ref}
        collapsable={false}
        onProps={onProps}
        style={
          path === 'hook'
            ? [styles.box, animatedStyle]
            : [styles.box, inlineStyle]
        }
      />
    </View>
  );
}

function CircleScenario({ path, onProps }: ScenarioProps) {
  const { colorSv } = useToggledValues();

  const animatedProps = useAnimatedProps(() => ({ fill: colorSv.value }));

  return (
    <View style={styles.container}>
      <Svg width={60} height={60}>
        {path === 'hook' ? (
          <AnimatedSpyCircle
            cx={30}
            cy={30}
            r={25}
            onProps={onProps}
            animatedProps={animatedProps}
          />
        ) : (
          <AnimatedSpyCircle
            cx={30}
            cy={30}
            r={25}
            onProps={onProps}
            fill={colorSv}
          />
        )}
      </Svg>
    </View>
  );
}

// The example passes the boolean shared value itself, not a derived value.
function SwitchScenario({ path, onProps }: ScenarioProps) {
  const { value } = useToggledValues();

  const animatedProps = useAnimatedProps(() => ({ value: value.value }));

  return (
    <View style={styles.container}>
      {path === 'hook' ? (
        <AnimatedSpySwitch onProps={onProps} animatedProps={animatedProps} />
      ) : (
        <AnimatedSpySwitch onProps={onProps} value={value} />
      )}
    </View>
  );
}

function TextInputScenario({ path, onProps }: ScenarioProps) {
  const { textSv } = useToggledValues();

  const animatedProps = useAnimatedProps(() => ({
    text: textSv.value,
    defaultValue: textSv.value,
  }));

  return (
    <View style={styles.container}>
      {path === 'hook' ? (
        <AnimatedSpyTextInput
          editable={false}
          style={styles.input}
          onProps={onProps}
          animatedProps={animatedProps}
        />
      ) : (
        <AnimatedSpyTextInput
          editable={false}
          style={styles.input}
          onProps={onProps}
          defaultValue={OFF_TEXT}
          text={textSv}
        />
      )}
    </View>
  );
}

const SCENARIOS = {
  view: ViewScenario,
  circle: CircleScenario,
  switch: SwitchScenario,
  textInput: TextInputScenario,
} satisfies Record<Kind, (props: ScenarioProps) => ReactElement>;

// Colors arrive at native as numbers. Other values are compared as they are,
// and anything unexpected becomes a string so the failed matcher shows it.
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

describe('inline styles and props', () => {
  test.each([
    {
      description: 'View backgroundColor, useAnimatedStyle',
      kind: 'view',
      path: 'hook',
      prop: 'backgroundColor',
      off: OFF_COLOR,
      on: ON_COLOR,
      shadowTree: true,
      mountedView: false,
      mode: ComparisonMode.COLOR,
    },
    {
      description: 'View backgroundColor, inline style',
      kind: 'view',
      path: 'inline',
      prop: 'backgroundColor',
      off: OFF_COLOR,
      on: ON_COLOR,
      shadowTree: true,
      mountedView: false,
      mode: ComparisonMode.COLOR,
    },
    {
      description: 'View opacity, useAnimatedStyle',
      kind: 'view',
      path: 'hook',
      prop: 'opacity',
      off: OFF_OPACITY,
      on: ON_OPACITY,
      shadowTree: true,
      mountedView: true,
      mode: ComparisonMode.FLOAT_DISTANCE,
    },
    {
      description: 'View opacity, inline style',
      kind: 'view',
      path: 'inline',
      prop: 'opacity',
      off: OFF_OPACITY,
      on: ON_OPACITY,
      shadowTree: true,
      mountedView: true,
      mode: ComparisonMode.FLOAT_DISTANCE,
    },
    {
      description: 'Circle fill, useAnimatedProps',
      kind: 'circle',
      path: 'hook',
      prop: 'fill',
      off: OFF_COLOR,
      on: ON_COLOR,
      shadowTree: false,
      mountedView: false,
      mode: ComparisonMode.COLOR,
    },
    {
      description: 'Circle fill, inline prop',
      kind: 'circle',
      path: 'inline',
      prop: 'fill',
      off: OFF_COLOR,
      on: ON_COLOR,
      shadowTree: false,
      mountedView: false,
      mode: ComparisonMode.COLOR,
    },
    {
      description: 'Switch value, useAnimatedProps',
      kind: 'switch',
      path: 'hook',
      prop: 'value',
      off: false,
      on: true,
      shadowTree: false,
      mountedView: false,
      mode: ComparisonMode.AUTO,
    },
    {
      description: 'Switch value, inline prop',
      kind: 'switch',
      path: 'inline',
      prop: 'value',
      off: false,
      on: true,
      shadowTree: false,
      mountedView: false,
      mode: ComparisonMode.AUTO,
    },
    {
      description: 'TextInput text, useAnimatedProps',
      kind: 'textInput',
      path: 'hook',
      prop: 'text',
      off: OFF_TEXT,
      on: ON_TEXT,
      shadowTree: false,
      mountedView: false,
      mode: ComparisonMode.STRING,
    },
    {
      description: 'TextInput text, inline prop',
      kind: 'textInput',
      path: 'inline',
      prop: 'text',
      off: OFF_TEXT,
      on: ON_TEXT,
      shadowTree: false,
      mountedView: false,
      mode: ComparisonMode.STRING,
    },
  ] satisfies Array<Case>)(
    '${description} follows the shared value before and after toggles',
    async ({ kind, path, prop, off, on, mode, shadowTree, mountedView }) => {
      const received: ReceivedProps[] = [];
      const updates = await recordAnimationUpdates();

      const Scenario = SCENARIOS[kind];

      await render(
        <Scenario
          path={path}
          prop={prop}
          onProps={(props) => received.push(props)}
        />
      );

      // The last value sent to native through the updateProps global, which
      // both paths use after mount. Only this component updates, so the
      // recorder holds one view. On a problem, return the message so the
      // failed matcher shows it.
      const lastSent = async () => {
        try {
          const sent = (await updates.getUpdates()).filter(
            (update) => prop in update
          );
          const last = sent[sent.length - 1] as ReceivedProps | undefined;
          return toComparable(last?.[prop], mode);
        } catch (error) {
          return `nothing sent: ${String(error)}`;
        }
      };
      // Committed shadow tree. Only View styles are readable there, so fill,
      // value and text are checked at the value sent to native instead.
      const committed = async () =>
        isValidPropName(prop)
          ? getTestComponent(BOX_REF).getAnimatedStyle(prop)
          : `${prop} is not readable from the shadow tree`;
      // The platform view: `alpha` on iOS and Android.
      const mounted = async () =>
        (await getTestComponent(BOX_REF).getMountedViewProps())?.opacity ??
        'not mounted';

      // Before any toggle: what React mounted the component with.
      const first = received[0];
      // View props are styles; the other kinds take the prop at the top level.
      const initial =
        kind === 'view'
          ? (first?.style as ReceivedProps | undefined)?.[prop]
          : first?.[prop];
      expect(toComparable(initial, mode)).toBe(off, mode);
      if (shadowTree) {
        expect(await committed()).toBe(off, mode);
      }
      if (mountedView) {
        // `render` resolves after the React commit; on Android the platform
        // view can attach a few frames later, so wait for it.
        await expectEventually(mounted).toBe(off, mode);
      }

      expect(typeof toggle).toBe('function');
      if (!toggle) {
        // Matchers do not throw: without this, every wait below times out.
        return;
      }
      for (const expected of [on, off]) {
        toggle();
        await expectEventually(lastSent).toBe(expected, mode);
        if (shadowTree) {
          await expectEventually(committed).toBe(expected, mode);
        }
        if (mountedView) {
          await expectEventually(mounted).toBe(expected, mode);
        }
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
