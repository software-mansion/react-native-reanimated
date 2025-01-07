import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionProperties,
  CSSTransitionSettings,
  StyleProps,
} from 'react-native-reanimated';
import Animated, {
  cubicBezier,
  LinearTransition,
} from 'react-native-reanimated';

import { colors, flex, radius, sizes, spacing } from '@/theme';
import { typedMemo } from '@/utils';
import {
  Button,
  Checkbox,
  ScrollScreen,
  Section,
  SelectListDropdown,
  Stagger,
  Text,
} from '~/css/components';
import {
  TransitionConfiguration,
  TransitionStyleChange,
} from '~/css/examples/transitions/components';

const SETTINGS_OPTIONS = {
  transitionBehavior: ['normal', 'allowDiscrete'],
  transitionDelay: ['-5s', '0s', '1s', '2s', '5s'],
  transitionDuration: [0, '250ms', '1s', '2s', '5s', '10s'],
  transitionTimingFunction: [
    'ease',
    'linear',
    'easeIn',
    'easeOut',
    cubicBezier(0.42, 0, 0.58, 1),
  ],
} satisfies {
  [K in keyof CSSTransitionSettings]: Array<CSSTransitionSettings[K]>;
};

const DEFAULT_SETTINGS: {
  [K in keyof typeof SETTINGS_OPTIONS]: (typeof SETTINGS_OPTIONS)[K][number];
} = {
  transitionBehavior: 'normal',
  transitionDelay: '0s',
  transitionDuration: '1s',
  transitionTimingFunction: 'ease',
};

const TRANSITION_STYLES: Array<StyleProps> = [
  { width: sizes.md },
  { width: sizes.xxxl },
];

export default function UpdatingTransitionSettings() {
  const [transitionProperties, setTransitionProperties] =
    useState<CSSTransitionProperties>({
      transitionProperty: 'all',
      ...DEFAULT_SETTINGS,
    });
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [displayStyleChanges, setDisplayStyleChanges] = useState(true);

  const handleResetSettings = useCallback(() => {
    setTransitionProperties((prev) => ({
      ...prev,
      ...DEFAULT_SETTINGS,
    }));
  }, []);

  const handleOptionSelect = useCallback(
    <T extends keyof CSSTransitionSettings>(
      propertyName: T,
      value: CSSTransitionSettings[T]
    ) => {
      setTransitionProperties((prev) => ({
        ...prev,
        [propertyName]: value,
      }));
    },
    []
  );

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          description="Select one of predefined values for each of the transition properties and observe how the transition changes"
          title="Updating Transition Settings">
          <View style={styles.content}>
            <View style={styles.config}>
              {Object.entries(SETTINGS_OPTIONS).map(
                ([propertyName, options]) => {
                  const key = propertyName as keyof CSSTransitionSettings;
                  return (
                    <ConfigOptionsRow
                      key={propertyName}
                      options={options}
                      propertyName={key}
                      selected={transitionProperties[key]}
                      onSelect={handleOptionSelect}
                    />
                  );
                }
              )}
            </View>

            <Animated.View layout={LinearTransition} style={styles.buttons}>
              <View style={styles.buttonRow}>
                <Text variant="label1">Reset settings</Text>
                <Button
                  style={styles.button}
                  title="Reset"
                  onPress={handleResetSettings}
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
            </Animated.View>

            <Animated.View layout={LinearTransition} style={styles.preview}>
              <Animated.View
                style={[
                  styles.box,
                  transitionProperties,
                  TRANSITION_STYLES[currentStyleIndex],
                ]}
              />
            </Animated.View>

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
          </View>
        </Section>

        <Section
          description="Transition configuration consists of the style changes that will be animated and the transition settings."
          title="Transition configuration">
          <TransitionConfiguration
            transitionProperties={transitionProperties}
            transitionStyles={TRANSITION_STYLES}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

type ConfigOptionsRowProps<T extends keyof CSSTransitionSettings> = {
  propertyName: T;
  options: Array<CSSTransitionSettings[T]>;
  selected: CSSTransitionSettings[T];
  onSelect: (propertyName: T, value: CSSTransitionSettings[T]) => void;
};

const ConfigOptionsRow = typedMemo(function ConfigOptionsRow<
  T extends keyof typeof SETTINGS_OPTIONS,
>({ onSelect, options, propertyName, selected }: ConfigOptionsRowProps<T>) {
  return (
    <View style={styles.configRow}>
      <Text style={flex.shrink} variant="label2">
        {propertyName}
      </Text>

      {propertyName === 'transitionBehavior' ? (
        <Text style={styles.selectInput} variant="label2">
          {selected as string}
        </Text>
      ) : (
        <SelectListDropdown
          alignment="right"
          selected={selected}
          styleOptions={{ inputStyle: styles.selectInput }}
          options={options.map((option) => ({
            label: option?.toString() ?? '',
            value: option,
          }))}
          onSelect={(option) => onSelect(propertyName, option)}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
  },
  button: {
    width: 75,
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttons: {
    gap: spacing.xxxs,
  },
  config: {
    gap: spacing.xs,
  },
  configRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  content: {
    gap: spacing.sm,
  },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
    justifyContent: 'center',
  },
  selectInput: {
    width: sizes.xxl,
  },
  styleChangeWrapper: {
    overflow: 'hidden',
  },
});
