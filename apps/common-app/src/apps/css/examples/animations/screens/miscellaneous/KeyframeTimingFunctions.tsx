import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationProperties,
  CSSAnimationTimingFunction,
} from 'react-native-reanimated';
import Animated, {
  cubicBezier,
  LinearTransition,
  steps,
} from 'react-native-reanimated';

import type {
  SelectableConfig,
  SelectableConfigPropertyOptions,
} from '@/apps/css/components';
import {
  Button,
  CodeBlock,
  ConfigSelector,
  CopyButton,
  ScrollScreen,
  Section,
  Stagger,
  Text,
  useSelectableConfig,
} from '@/apps/css/components';
import { stringifyConfig } from '@/apps/css/utils';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const AVAILABLE_TIMING_FUNCTIONS = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  cubicBezier(0.175, 0.885, 0.32, 1.275),
  steps(4),
] satisfies Array<CSSAnimationTimingFunction>;

type AvailableTimingFunction = (typeof AVAILABLE_TIMING_FUNCTIONS)[number];

const getOptions = (
  value: AvailableTimingFunction,
  disabled = false
): SelectableConfigPropertyOptions<AvailableTimingFunction> => ({
  canDisable: true,
  disabled,
  options: AVAILABLE_TIMING_FUNCTIONS,
  value,
});

const DEFAULT_ANIMATION_CONFIG: SelectableConfig<CSSAnimationProperties> = {
  $animationTimingFunction: getOptions(cubicBezier(0.175, 0.885, 0.32, 1.275)),
  animationDirection: 'alternate',
  animationDuration: '4s',
  animationIterationCount: 'infinite',
  animationName: {
    '0%': {
      $animationTimingFunction: getOptions('ease-in'),
      transform: [{ translateX: -sizes.lg }],
      width: sizes.xl,
    },
    '33%': {
      $animationTimingFunction: getOptions(steps(4)),
      transform: [{ translateY: sizes.md }],
    },
    '66%': {
      $animationTimingFunction: getOptions('linear', true),
      backgroundColor: colors.primaryDark,
      transform: [{ translateY: -sizes.md }],
    },
    // eslint-disable-next-line perfectionist/sort-objects
    '100%': {
      backgroundColor: colors.primaryLight,
      transform: [{ translateX: sizes.lg }],
      width: sizes.lg,
    },
  },
};

export default function KeyframeTimingFunctions() {
  const [selectableConfig, setSelectableConfig] = useState(
    DEFAULT_ANIMATION_CONFIG
  );
  const animation = useSelectableConfig(selectableConfig);

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          title="Keyframe Timing Functions"
          description={[
            '**Enable**, **disable** or **change** the animation timing function in the animation properties config below.',
            '- press on the **checkbox** to add or remove the property',
            '- select a **timing function** from the property value dropdown',
          ]}>
          <View style={styles.buttonRow}>
            <Text variant="subHeading2">Select properties:</Text>
            <CopyButton onCopy={() => stringifyConfig(animation, false)} />
          </View>
          <ConfigSelector
            config={selectableConfig}
            onChange={setSelectableConfig}
          />
          <Animated.View layout={LinearTransition} style={styles.buttonRow}>
            <Text variant="label1">Reset config</Text>
            <Button
              title="Reset"
              onPress={() => setSelectableConfig(DEFAULT_ANIMATION_CONFIG)}
            />
          </Animated.View>
          <Animated.View layout={LinearTransition} style={styles.preview}>
            <Animated.View style={[styles.box, animation]} />
          </Animated.View>
        </Section>

        <Section
          description="Selected animation configuration"
          title="Animation Configuration">
          <Animated.View layout={LinearTransition} style={styles.codeWrapper}>
            <CodeBlock code={stringifyConfig(animation)} />
          </Animated.View>
        </Section>

        <Section
          description="This section explains how the timing function is applied when specified on an **animation level** or on **specific keyframes**."
          title="Explanation">
          {[
            '###### When specified on an animation:',
            '- The `animationTimingFunction` is applied **between each pair of keyframes** where a property is specified.',
            '- For example, if an animation has keyframes at `0%`, `25%`, `50%`, and `100%` and the `width` property is specified at `0%` and `25%`, the timing function is applied between `0% → 25%` and separately between `25% → 100%`',
            '###### When specified on a keyframe:',
            '- It overrides the base `animationTimingFunction` for all properties defined in that keyframe.',
            '- The overridden timing function applies **until the next keyframe** where those properties are specified.',
            '- For example, if a timing function is set at `25%` for `width`, it will affect the animation of this property from `25%` to the next keyframe where `width` is specified.',
            '- Timing function specified in the **last keyframe** is **ignored**.',
          ].map((paragraph, index) => (
            <Text key={index}>{paragraph}</Text>
          ))}
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: sizes.lg,
    width: sizes.lg,
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  preview: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxxl,
    overflow: 'hidden',
  },
});
