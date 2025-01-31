import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationKeyframes,
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated, {
  cubicBezier,
  LinearTransition,
} from 'react-native-reanimated';

import {
  Button,
  CodeBlock,
  ScrollScreen,
  Section,
  SelectListDropdown,
  Stagger,
  Text,
} from '@/apps/css/components';
import { stringifyConfig } from '@/apps/css/utils';
import { colors, flex, radius, sizes, spacing } from '@/theme';
import { typedMemo } from '@/utils';

const keyframes: CSSAnimationKeyframes = {
  to: {
    width: sizes.xxxl,
  },
};

const SETTINGS_OPTIONS = {
  animationDelay: ['-5s', '0s', '1s', '2s', '5s'],
  animationDirection: ['normal', 'reverse', 'alternate', 'alternate-reverse'],
  animationDuration: ['1s', '2s', '5s', '10s'],
  animationFillMode: ['none', 'forwards', 'backwards', 'both'],
  animationIterationCount: [1, 2, 'infinite'],
  animationPlayState: ['running', 'paused'],
  animationTimingFunction: [
    'ease',
    'linear',
    'ease-in',
    'ease-out',
    cubicBezier(0.42, 0, 0.58, 1),
  ],
} satisfies {
  [K in keyof CSSAnimationSettings]: Array<CSSAnimationSettings[K]>;
};

const BUTTONS_ROW_OPTIONS = new Set<keyof typeof SETTINGS_OPTIONS>([
  'animationPlayState',
]);

const DEFAULT_SETTINGS: {
  [K in keyof typeof SETTINGS_OPTIONS]: (typeof SETTINGS_OPTIONS)[K][number];
} = {
  animationDelay: '0s',
  animationDirection: 'normal',
  animationDuration: '2s',
  animationFillMode: 'none',
  animationIterationCount: 1,
  animationPlayState: 'paused',
  animationTimingFunction: 'ease',
};

export default function UpdatingAnimationSettings() {
  const [viewKey, setViewKey] = useState(0);
  const [animationProperties, setAnimationProperties] =
    useState<CSSAnimationProperties>({
      animationName: keyframes,
      ...DEFAULT_SETTINGS,
    });

  const handleResetSettings = useCallback(() => {
    setAnimationProperties((prev) => ({
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
      setAnimationProperties((prev) => ({
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
          description="Select one of predefined values for each of the animation properties and observe how the animation changes"
          title="Updating Animation Settings">
          <View style={styles.content}>
            <View style={styles.config}>
              {Object.entries(SETTINGS_OPTIONS).map(
                ([propertyName, options]) => {
                  const key = propertyName as keyof CSSAnimationSettings;
                  return (
                    <ConfigOptionsRow
                      key={propertyName}
                      options={options}
                      propertyName={key}
                      selected={animationProperties[key]}
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
                  style={styles.resetButton}
                  title="Reset"
                  onPress={handleResetSettings}
                />
              </View>
              <View style={styles.resetButtonRow}>
                <Text variant="label1">Restart animation</Text>
                <Button
                  style={styles.resetButton}
                  title="Restart"
                  onPress={handleRestartAnimation}
                />
              </View>
            </Animated.View>

            <Animated.View layout={LinearTransition} style={styles.preview}>
              <Animated.View
                key={viewKey}
                style={[styles.box, animationProperties]}
              />
            </Animated.View>
          </View>
        </Section>

        <Section
          description="Selected animation configuration"
          title="Animation Configuration">
          <Animated.View layout={LinearTransition} style={styles.codeWrapper}>
            <CodeBlock code={stringifyConfig(animationProperties)} />
          </Animated.View>
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

type ConfigOptionsRowProps<T extends keyof CSSAnimationSettings> = {
  propertyName: T;
  options: Array<CSSAnimationSettings[T]>;
  selected: CSSAnimationSettings[T];
  onSelect: (propertyName: T, value: CSSAnimationSettings[T]) => void;
};

const ConfigOptionsRow = typedMemo(function ConfigOptionsRow<
  T extends keyof typeof SETTINGS_OPTIONS,
>({ onSelect, options, propertyName, selected }: ConfigOptionsRowProps<T>) {
  return (
    <View style={styles.configRow}>
      <Text style={flex.shrink} variant="label2">
        {propertyName}
      </Text>

      {BUTTONS_ROW_OPTIONS.has(propertyName) ? (
        <View style={styles.buttons}>
          {options.map(
            (option) =>
              option && (
                <Button
                  disabled={selected === option}
                  key={option.toString()}
                  size="small"
                  title={option.toString()}
                  onPress={() => onSelect(propertyName, option)}
                />
              )
          )}
        </View>
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
    width: sizes.md,
  },
  buttons: {
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  codeWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    padding: spacing.xs,
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
  resetButton: {
    width: 80,
  },
  resetButtonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resetButtons: {
    gap: spacing.xxs,
  },
  selectInput: {
    width: sizes.xxl,
  },
});
