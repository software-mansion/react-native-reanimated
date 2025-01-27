import { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type CSSTransitionProperties,
  cubicBezier,
  LinearTransition,
  steps,
} from 'react-native-reanimated';

import type { SelectableConfig } from '@/apps/css/components';
import {
  Button,
  Checkbox,
  ConfigSelector,
  ScrollScreen,
  Section,
  Stagger,
  Text,
  useSelectableConfig,
} from '@/apps/css/components';
import {
  TransitionConfiguration,
  TransitionStyleChange,
} from '@/apps/css/examples/transitions/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const DEFAULT_TRANSITION_CONFIG: SelectableConfig<
  Partial<CSSTransitionProperties>
> = {
  $transitionProperty: {
    maxNumberOfValues: 3,
    options: ['width', 'height', 'transform'],
    value: ['width', 'height', 'transform'],
  },
  // eslint-disable-next-line perfectionist/sort-objects
  $transitionDuration: {
    canDisable: true,
    maxNumberOfValues: 3,
    options: ['0s', '1s', '2s', '5s'],
    value: ['1s', '2s'],
  },
  // eslint-disable-next-line perfectionist/sort-objects
  $transitionDelay: {
    canDisable: true,
    maxNumberOfValues: 3,
    options: ['0s', '1s', '2s', '5s'],
    value: ['0s', '1s'],
  },
  $transitionTimingFunction: {
    canDisable: true,
    maxNumberOfValues: 3,
    options: [
      'ease',
      'ease-in-out',
      cubicBezier(0.175, 0.885, 0.32, 1.275),
      steps(5),
    ],
    value: [cubicBezier(0.175, 0.885, 0.32, 1.275), 'ease-in-out'],
  },
  transitionBehavior: 'normal',
};

const TRANSITION_STYLES: Array<ViewStyle> = [
  {
    height: sizes.md,
    width: sizes.md,
  },
  {
    height: sizes.xl,
    width: sizes.xl,
  },
  {
    height: sizes.md,
    transform: [{ rotate: '90deg' }],
    width: sizes.md,
  },
  {
    height: sizes.xl,
    transform: [{ rotate: '-90deg' }],
    width: sizes.xl,
  },
];

export default function MultipleTransitionSettings() {
  const [selectableConfig, setSelectableConfig] = useState(
    DEFAULT_TRANSITION_CONFIG
  );
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [displayStyleChanges, setDisplayStyleChanges] = useState(true);

  const transition = useSelectableConfig(
    selectableConfig
  ) as CSSTransitionProperties;

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          description="Change the **transition property**, **duration**, **delay**, and **timing function** to see how they influence the transition between styles."
          title="Multiple Transition Settings">
          <ConfigSelector
            blockStyle={styles.block}
            config={selectableConfig}
            dropdownStyle={styles.dropdown}
            onChange={setSelectableConfig}
          />

          <View style={styles.preview}>
            <Animated.View
              style={[
                styles.box,
                transition,
                TRANSITION_STYLES[currentStyleIndex],
              ]}
            />
          </View>

          <View style={styles.buttonRows}>
            <View style={styles.buttonRow}>
              <Text variant="label1">Reset settings</Text>
              <Button
                style={styles.button}
                title="Reset"
                onPress={() => setSelectableConfig(DEFAULT_TRANSITION_CONFIG)}
              />
            </View>
            <View style={styles.buttonRow}>
              <Text variant="label1">Run transition</Text>
              <Button
                style={styles.button}
                title="Run"
                onPress={() =>
                  setCurrentStyleIndex(
                    (prev) => (prev + 1) % TRANSITION_STYLES.length
                  )
                }
              />
            </View>
          </View>

          <Animated.View
            layout={LinearTransition}
            style={styles.styleChangeWrapper}>
            {displayStyleChanges && (
              <TransitionStyleChange
                activeStyleIndex={currentStyleIndex}
                transitionStyles={TRANSITION_STYLES}
              />
            )}
          </Animated.View>
          <Checkbox
            label="Display style changes"
            selected={displayStyleChanges}
            onChange={setDisplayStyleChanges}
          />
        </Section>

        <Section
          description="Transition configuration consists of the style changes that will be animated and the transition settings."
          title="Transition configuration">
          <TransitionConfiguration
            transitionProperties={transition}
            transitionStyles={TRANSITION_STYLES}
          />
        </Section>

        <Section
          description="This section explains how transition settings are applied when an array of properties is specified."
          title="Explanation">
          {[
            '###### Single value is specified:',
            '- **The same** value is applied **to all** transitioned properties.',
            '- For example, if `width` and `height` are transitioned and `1s` is specified as the `transitionDuration`, both properties will transition over `1s`.',
            '###### Number of values is the same as number of transitioned properties:',
            '- Each value is applied to the corresponding property.',
            '- For example, if `width` and `height` are transitioned and `transitionDuration` is set to `["1s", "2s"]`, `width` will transition over `1s` and `height` over `2s`.',
            '###### Number of values is different from number of transitioned properties:',
            '- If there are more values than properties, extra values are **ignored**.',
            '- If there are less values than properties, values will be applied in a **circular manner**.',
            '- For example, if `width`, `height`, and `transform` are transitioned and `transitionDuration` is set to `["1s", "2s"]`, `width` will transition over `1s`, `height` over `2s`, and `transform` over `1s`.',
          ].map((paragraph, index) => (
            <Text key={index}>{paragraph}</Text>
          ))}
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.xxs,
  },
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  button: {
    width: 75,
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonRows: {
    gap: spacing.xxxs,
  },
  dropdown: {
    maxWidth: 245,
  },
  preview: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
    overflow: 'hidden',
  },
  styleChangeWrapper: {
    overflow: 'hidden',
  },
});
