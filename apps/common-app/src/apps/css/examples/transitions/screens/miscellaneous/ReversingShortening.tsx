/* eslint-disable perfectionist/sort-objects */

import { useCallback, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import Animated, {
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
  TabPanel,
  Text,
  useSelectableConfig,
} from '@/apps/css/components';
import {
  TransitionConfiguration,
  TransitionStyleChange,
} from '@/apps/css/examples/transitions/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const DEFAULT_TRANSITION_CONFIG: SelectableConfig<CSSTransitionProperties> = {
  transitionProperty: 'all',
  $transitionDuration: {
    options: ['0s', '1s', '2s', '5s'],
    value: '1s',
  },
  $transitionDelay: {
    options: ['0s', '1s', '2s', '5s'],
    value: '0s',
  },
  $transitionTimingFunction: {
    options: [
      'linear',
      'ease',
      'ease-in',
      'ease-out',
      'ease-in-out',
      cubicBezier(0.175, 0.885, 0.32, 1.275),
      steps(5),
    ],
    value: 'linear',
  },
};

type ExampleProps = {
  name: string;
  transitionStyles: Array<ViewStyle>;
  description: string;
};

const EXAMPLES: Array<ExampleProps> = [
  {
    description:
      'There are only **2 different states** which are applied **interchangeably**.',
    name: '2 states',
    transitionStyles: [
      { left: 0, transform: [{ translateX: 0 }] },
      { left: '100%', transform: [{ translateX: '-100%' }] },
    ],
  },
  {
    description:
      'There are **4 different states** that cycle in sequence. States 1 and 3 are nearly identical with a **minimal position difference**, while states 2 and 4 are also nearly identical but on the opposite side. Because of that, the **shortening** of the transition duration is **not applied**.',
    name: '4 states',
    transitionStyles: [
      { left: 0, transform: [{ translateX: 0 }] },
      { left: '100%', transform: [{ translateX: '-100%' }] },
      { left: 1, transform: [{ translateX: '1%' }] },
      { left: '99%', transform: [{ translateX: '-99%' }] },
    ],
  },
];

export default function ReversingShortening() {
  const [selectableConfig, setSelectableConfig] = useState(
    DEFAULT_TRANSITION_CONFIG
  );
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [displayStyleChanges, setDisplayStyleChanges] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);

  const transition = useSelectableConfig(selectableConfig);

  const { name: exampleName, transitionStyles } = EXAMPLES[exampleIndex];

  const handleSelectTab = useCallback((index: number) => {
    setCurrentStyleIndex(0);
    setExampleIndex(index);
  }, []);

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          description="This example demonstrates how transition duration is shortened for **reverse transitions**. This applies only to transitions where the property is animated **between 2 states** that are applied interchangeably and the transition is **interrupted before finishing**."
          title="Reversing Shortening of Interrupted Transitions">
          <ConfigSelector
            blockStyle={styles.block}
            config={selectableConfig}
            onChange={setSelectableConfig}
          />

          <Animated.View layout={LinearTransition} style={styles.buttonRows}>
            <View style={styles.buttonRow}>
              <Text variant="label1">Reset config</Text>
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
                    (prev) => (prev + 1) % transitionStyles.length
                  )
                }
              />
            </View>
          </Animated.View>

          <TabPanel
            contentContainerStyle={styles.previewContainer}
            selectedTabIndex={exampleIndex}
            onSelectTab={handleSelectTab}>
            {EXAMPLES.map(
              ({
                description,
                name,
                transitionStyles: exampleTransitionStyles,
              }) => (
                <TabPanel.Tab key={name} name={name}>
                  <Text>{description}</Text>
                  <View style={flex.center}>
                    <View style={styles.outerWrapper}>
                      <View style={styles.innerWrapper}>
                        <Animated.View
                          style={[
                            styles.box,
                            transition,
                            exampleTransitionStyles[currentStyleIndex],
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </TabPanel.Tab>
              )
            )}
          </TabPanel>

          <Animated.View
            layout={LinearTransition}
            style={styles.styleChangeWrapper}>
            {displayStyleChanges && (
              <TransitionStyleChange
                activeStyleIndex={currentStyleIndex}
                transitionStyles={transitionStyles}
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
            stylesTitle={`Transition styles for ${exampleName} example`}
            transitionProperties={transition}
            transitionStyles={transitionStyles}
          />
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
    height: sizes.md,
    width: sizes.md,
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
  innerWrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  outerWrapper: {
    backgroundColor: colors.background3,
    borderRadius: radius.sm,
    overflow: 'hidden',
    paddingHorizontal: sizes.sm,
    width: '75%',
  },
  previewContainer: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  styleChangeWrapper: {
    overflow: 'hidden',
  },
});
