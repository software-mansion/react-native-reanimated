import type { ComponentRef, ReactElement } from 'react';
import { forwardRef, useCallback, useEffect } from 'react';
import type { TextInputProps, ViewProps, ViewStyle } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import type { CircleProps } from 'react-native-svg';
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
import { ComparisonMode } from '../../../ReJest/types';
import { convertDecimalColor } from '../../../ReJest/utils/util';

// Covers InlineStylesAndPropsExample.tsx: a shared value passed inline, as a
// style value or as a top-level prop, must reach native like the same value
// passed through useAnimatedStyle or useAnimatedProps (#10147, fixed in
// #10151). Each case renders one component and toggles a boolean shared value
// with `sv.set`, as the example's Toggle button does, so no React render is
// involved in the update.

const BOX_REF = 'INLINE_STYLES_AND_PROPS_BOX';

const OFF_COLOR = 'red';
const ON_COLOR = 'lime';
const OFF_TEXT = 'false';
const ON_TEXT = 'true';

type Kind = 'view' | 'circle' | 'textInput';
type Path = 'hook' | 'inline';
type ReceivedProps = Record<string, unknown>;

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
  CircleProps & SpyProps
>(({ onProps, ...props }, ref) => {
  onProps(props);
  return <Circle ref={ref} {...props} />;
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
const AnimatedSpyTextInput = Animated.createAnimatedComponent(SpyTextInput);

type ScenarioProps = {
  path: Path;
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
  const textSv = useDerivedValue(() => (value.value ? ON_TEXT : OFF_TEXT));

  return { colorSv, textSv };
}

// Only this scenario registers the test ref: `render` waits for every
// registered ref to mount, and the SVG and TextInput scenarios do not read it.
function ViewScenario({ path, onProps }: ScenarioProps) {
  const ref = useTestRef(BOX_REF);
  const { colorSv } = useToggledValues();

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: colorSv.value,
  }));

  return (
    <View style={styles.container}>
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
  textInput: TextInputScenario,
} satisfies Record<Kind, (props: ScenarioProps) => ReactElement>;

function colorOf(value: unknown): unknown {
  return typeof value === 'number' ? convertDecimalColor(value) : value;
}

describe('inline styles and props', () => {
  test.each([
    {
      description: 'View backgroundColor, useAnimatedStyle',
      kind: 'view' as const,
      path: 'hook' as const,
      prop: 'backgroundColor',
      off: OFF_COLOR,
      on: ON_COLOR,
      mode: ComparisonMode.COLOR,
    },
    {
      description: 'View backgroundColor, inline style',
      kind: 'view' as const,
      path: 'inline' as const,
      prop: 'backgroundColor',
      off: OFF_COLOR,
      on: ON_COLOR,
      mode: ComparisonMode.COLOR,
    },
    {
      description: 'Circle fill, useAnimatedProps',
      kind: 'circle' as const,
      path: 'hook' as const,
      prop: 'fill',
      off: OFF_COLOR,
      on: ON_COLOR,
      mode: ComparisonMode.COLOR,
    },
    {
      description: 'Circle fill, inline prop',
      kind: 'circle' as const,
      path: 'inline' as const,
      prop: 'fill',
      off: OFF_COLOR,
      on: ON_COLOR,
      mode: ComparisonMode.COLOR,
    },
    {
      description: 'TextInput text, useAnimatedProps',
      kind: 'textInput' as const,
      path: 'hook' as const,
      prop: 'text',
      off: OFF_TEXT,
      on: ON_TEXT,
      mode: ComparisonMode.STRING,
    },
    {
      description: 'TextInput text, inline prop',
      kind: 'textInput' as const,
      path: 'inline' as const,
      prop: 'text',
      off: OFF_TEXT,
      on: ON_TEXT,
      mode: ComparisonMode.STRING,
    },
  ])(
    '${description} follows the shared value before and after toggles',
    async ({ kind, path, prop, off, on, mode }) => {
      const received: ReceivedProps[] = [];
      const updates = await recordAnimationUpdates();

      const Scenario = SCENARIOS[kind];

      await render(
        <Scenario path={path} onProps={(props) => received.push(props)} />
      );

      const isStyle = kind === 'view';

      // The last value sent to native through the updateProps global, which
      // both paths use after mount. Only this component updates, so the
      // recorder holds one view. On a problem, return the message so the
      // failed matcher shows it.
      const lastSent = async () => {
        try {
          const sent = (await updates.getUpdates()).filter(
            (update) => prop in update
          );
          return colorOf(
            (sent[sent.length - 1] as ReceivedProps | undefined)?.[prop]
          ) as string;
        } catch (error) {
          return `nothing sent: ${String(error)}`;
        }
      };
      // Committed shadow tree. Only backgroundColor is readable there, so
      // fill and text are checked at the value sent to native instead.
      const committed = () =>
        getTestComponent(BOX_REF).getAnimatedStyle('backgroundColor');

      // Before any toggle: what React mounted the component with.
      const first = received[0];
      const initial = isStyle
        ? (first?.style as ViewStyle | undefined)?.backgroundColor
        : first?.[prop];
      expect(initial as string).toBe(off, mode);
      if (isStyle) {
        expect(await committed()).toBe(off, mode);
      }

      expect(typeof toggle).toBe('function');
      for (const expected of [on, off]) {
        toggle?.();
        await expectEventually(lastSent).toBe(expected, mode);
        if (isStyle) {
          await expectEventually(committed).toBe(expected, mode);
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
