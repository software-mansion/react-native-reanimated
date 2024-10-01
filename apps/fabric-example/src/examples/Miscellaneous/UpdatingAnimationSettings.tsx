import { View, StyleSheet } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationKeyframes,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import {
  Button,
  CodeBlock,
  Scroll,
  Section,
  SelectListDropdown,
  Stagger,
  Text,
} from '../../components';
import { colors, flex, radius, sizes, spacing } from '../../theme';
import Animated, {
  cubicBezier,
  LinearTransition,
} from 'react-native-reanimated';
import { useCallback, useState } from 'react';
import { formatAnimationCode, typedMemo } from '../../utils';

const keyframes: CSSAnimationKeyframes = {
  to: {
    width: sizes.xxxl,
  },
};

const SETTINGS_OPTIONS = {
  animationDuration: ['1s', '2s', '5s', '10s'],
  animationTimingFunction: [
    'ease',
    'linear',
    'easeIn',
    'easeOut',
    cubicBezier(0.42, 0, 0.58, 1),
  ],
  animationDelay: ['-5s', '0s', '1s', '2s', '5s'],
  animationIterationCount: [1, 2, 'infinite'],
  animationDirection: ['normal', 'reverse', 'alternate', 'alternateReverse'],
  animationFillMode: ['none', 'forwards', 'backwards', 'both'],
  animationPlayState: ['running', 'paused'],
} satisfies {
  [K in keyof CSSAnimationSettings]: CSSAnimationSettings[K][];
};

const BUTTONS_ROW_OPTIONS = new Set<keyof typeof SETTINGS_OPTIONS>([
  'animationPlayState',
]);

const DEFAULT_SETTINGS: {
  [K in keyof typeof SETTINGS_OPTIONS]: (typeof SETTINGS_OPTIONS)[K][number];
} = {
  animationDuration: '2s',
  animationTimingFunction: 'ease',
  animationDelay: '0s',
  animationIterationCount: 1,
  animationDirection: 'normal',
  animationFillMode: 'none',
  animationPlayState: 'paused',
};

export default function UpdatingAnimationSettings() {
  const [viewKey, setViewKey] = useState(0);
  const [animationConfig, setAnimationConfig] = useState<CSSAnimationConfig>({
    animationName: keyframes,
    ...DEFAULT_SETTINGS,
  });

  const handleResetSettings = useCallback(() => {
    setAnimationConfig((prev) => ({
      ...prev,
      ...DEFAULT_SETTINGS,
    }));
  }, []);

  const handleRestartAnimation = useCallback(() => {
    setViewKey((prev) => prev + 1);
  }, []);

  const handleOptionSelect = useCallback(
    <T extends keyof CSSAnimationSettings>(
      propertyName: T,
      value: CSSAnimationSettings[T]
    ) => {
      setAnimationConfig((prev) => ({
        ...prev,
        [propertyName]: value,
      }));
    },
    []
  );

  return (
    <Scroll>
      <Stagger>
        <Section
          title="Updating Animation Settings"
          description="Select one of predefined values for each of the animation properties and observe how the animation changes">
          <View style={styles.content}>
            <View style={styles.config}>
              {Object.entries(SETTINGS_OPTIONS).map(
                ([propertyName, options]) => {
                  const key = propertyName as keyof CSSAnimationSettings;
                  return (
                    <ConfigOptionsRow
                      key={propertyName}
                      propertyName={key}
                      options={options}
                      selected={animationConfig[key]}
                      onSelect={handleOptionSelect}
                    />
                  );
                }
              )}
            </View>

            <Animated.View
              layout={LinearTransition}
              style={styles.resetButtons}>
              <View style={styles.resetButtonRow}>
                <Text variant="label1">Reset settings</Text>
                <Button
                  title="Reset"
                  onPress={handleResetSettings}
                  style={styles.resetButton}
                />
              </View>
              <View style={styles.resetButtonRow}>
                <Text variant="label1">Restart animation</Text>
                <Button
                  title="Restart"
                  onPress={handleRestartAnimation}
                  style={styles.resetButton}
                />
              </View>
            </Animated.View>

            <Animated.View style={styles.preview} layout={LinearTransition}>
              <Animated.View
                key={viewKey}
                style={[styles.box, animationConfig]}
              />
            </Animated.View>
          </View>
        </Section>

        <Section
          title="Animation Configuration"
          description="Selected animation configuration">
          <Animated.View style={styles.codeWrapper} layout={LinearTransition}>
            <CodeBlock code={formatAnimationCode(animationConfig)} />
          </Animated.View>
        </Section>
      </Stagger>
    </Scroll>
  );
}

type ConfigOptionsRowProps<T extends keyof CSSAnimationSettings> = {
  propertyName: T;
  options: CSSAnimationSettings[T][];
  selected: CSSAnimationSettings[T];
  onSelect: (propertyName: T, value: CSSAnimationSettings[T]) => void;
};

const ConfigOptionsRow = typedMemo(function ConfigOptionsRow<
  T extends keyof typeof SETTINGS_OPTIONS,
>({ propertyName, options, onSelect, selected }: ConfigOptionsRowProps<T>) {
  return (
    <View style={styles.configRow}>
      <Text variant="label2" style={flex.shrink}>
        {propertyName}
      </Text>

      {BUTTONS_ROW_OPTIONS.has(propertyName) ? (
        <View style={styles.buttons}>
          {options.map(
            (option) =>
              option && (
                <Button
                  size="small"
                  key={option.toString()}
                  title={option.toString()}
                  onPress={() => onSelect(propertyName, option)}
                  disabled={selected === option}
                />
              )
          )}
        </View>
      ) : (
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
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  resetButtons: {
    gap: spacing.xxs,
  },
  resetButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resetButton: {
    width: 75,
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
  buttons: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flexShrink: 1,
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
    width: sizes.md,
  },
  codeWrapper: {
    backgroundColor: colors.background2,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
});
