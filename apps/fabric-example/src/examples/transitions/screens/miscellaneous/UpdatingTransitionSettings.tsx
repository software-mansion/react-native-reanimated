import { typedMemo } from '../../../../utils';
import {
  Button,
  Checkbox,
  ScrollScreen,
  Section,
  SelectListDropdown,
  Stagger,
  Text,
} from '../../../../components';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cubicBezier,
  LinearTransition,
} from 'react-native-reanimated';
import { colors, flex, radius, sizes, spacing } from '../../../../theme';
import type {
  CSSTransitionConfig,
  CSSTransitionSettings,
  StyleProps,
} from 'react-native-reanimated';
import {
  TransitionConfiguration,
  TransitionStyleChange,
} from '../../components';

const SETTINGS_OPTIONS = {
  transitionDuration: [0, '250ms', '1s', '2s', '5s', '10s'],
  transitionTimingFunction: [
    'ease',
    'linear',
    'easeIn',
    'easeOut',
    cubicBezier(0.42, 0, 0.58, 1),
  ],
  transitionDelay: ['-5s', '0s', '1s', '2s', '5s'],
} satisfies {
  [K in keyof CSSTransitionSettings]: CSSTransitionSettings[K][];
};

const DEFAULT_SETTINGS: {
  [K in keyof typeof SETTINGS_OPTIONS]: (typeof SETTINGS_OPTIONS)[K][number];
} = {
  transitionDuration: '1s',
  transitionTimingFunction: 'ease',
  transitionDelay: '0s',
};

const transitionStyles: StyleProps[] = [
  { width: sizes.md },
  { width: sizes.xxxl },
];

export default function UpdatingTransitionSettings() {
  const [transitionConfig, setTransitionConfig] = useState<CSSTransitionConfig>(
    {
      transitionProperty: 'all',
      ...DEFAULT_SETTINGS,
    }
  );
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [displayStyleChanges, setDisplayStyleChanges] = useState(true);

  const handleResetSettings = useCallback(() => {
    setTransitionConfig((prev) => ({
      ...prev,
      ...DEFAULT_SETTINGS,
    }));
  }, []);

  const handleOptionSelect = useCallback(
    <T extends keyof CSSTransitionSettings>(
      propertyName: T,
      value: CSSTransitionSettings[T]
    ) => {
      setTransitionConfig((prev) => ({
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
          title="Updating Transition Settings"
          description="Select one of predefined values for each of the transition properties and observe how the transition changes">
          <View style={styles.content}>
            <View style={styles.config}>
              {Object.entries(SETTINGS_OPTIONS).map(
                ([propertyName, options]) => {
                  const key = propertyName as keyof CSSTransitionSettings;
                  return (
                    <ConfigOptionsRow
                      key={propertyName}
                      propertyName={key}
                      options={options}
                      selected={transitionConfig[key]}
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
                  title="Reset"
                  onPress={handleResetSettings}
                  style={styles.button}
                />
              </View>

              <View style={styles.buttonRow}>
                <Text variant="label1">Run transition</Text>
                <Button
                  title="Run"
                  onPress={() =>
                    setCurrentStyleIndex(
                      (prev) => (prev + 1) % transitionStyles.length
                    )
                  }
                  style={styles.button}
                />
              </View>
            </Animated.View>

            <Animated.View style={styles.preview} layout={LinearTransition}>
              <Animated.View
                style={[
                  styles.box,
                  transitionConfig,
                  transitionStyles[currentStyleIndex],
                ]}
              />
            </Animated.View>

            <Animated.View
              style={styles.styleChangeWrapper}
              layout={LinearTransition}>
              {displayStyleChanges && (
                <TransitionStyleChange
                  transitionStyles={transitionStyles}
                  activeStyleIndex={currentStyleIndex}
                />
              )}
            </Animated.View>

            <Checkbox
              label="Display style changes"
              onChange={setDisplayStyleChanges}
              selected={displayStyleChanges}
            />
          </View>
        </Section>

        <Section
          title="Transition configuration"
          description="Transition configuration consists of the style changes that will be animated and the transition settings.">
          <TransitionConfiguration
            sharedConfig={transitionConfig}
            transitionStyles={transitionStyles}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

type ConfigOptionsRowProps<T extends keyof CSSTransitionSettings> = {
  propertyName: T;
  options: CSSTransitionSettings[T][];
  selected: CSSTransitionSettings[T];
  onSelect: (propertyName: T, value: CSSTransitionSettings[T]) => void;
};

const ConfigOptionsRow = typedMemo(function ConfigOptionsRow<
  T extends keyof typeof SETTINGS_OPTIONS,
>({ propertyName, options, onSelect, selected }: ConfigOptionsRowProps<T>) {
  return (
    <View style={styles.configRow}>
      <Text variant="label2" style={flex.shrink}>
        {propertyName}
      </Text>

      <SelectListDropdown
        styleOptions={{ inputStyle: styles.selectInput }}
        alignment="right"
        options={options.map((option) => ({
          label: option?.toString() ?? '',
          value: option,
        }))}
        onSelect={(option) => onSelect(propertyName, option)}
        selected={selected}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  config: {
    gap: spacing.xs,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectInput: {
    width: sizes.xxl,
  },
  preview: {
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
  },
  buttons: {
    gap: spacing.xxxs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    width: 75,
  },
  styleChangeWrapper: {
    overflow: 'hidden',
  },
});
