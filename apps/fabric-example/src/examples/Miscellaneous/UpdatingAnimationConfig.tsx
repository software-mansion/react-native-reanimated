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
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useCallback, useState } from 'react';
import { typedMemo } from '../../utils';

const keyframes: CSSAnimationKeyframes = {
  to: {
    width: sizes.xxxl,
  },
};

const CONFIG_OPTIONS = {
  animationDuration: ['1s', '2s', '5s', '10s'],
  animationTimingFunction: ['ease', 'linear', 'easeIn', 'easeOut'],
  animationDelay: ['-5s', '0s', '1s', '2s', '5s'],
  animationIterationCount: [1, 2, 'infinite'],
  animationDirection: ['normal', 'reverse', 'alternate', 'alternate-reverse'],
  animationFillMode: ['none', 'forwards', 'backwards', 'both'],
} satisfies {
  [K in keyof CSSAnimationSettings]: CSSAnimationConfig[K][];
};

const DEFAULT_CONFIG: {
  [K in keyof typeof CONFIG_OPTIONS]: (typeof CONFIG_OPTIONS)[K][number];
} = {
  animationDuration: '1s',
  animationTimingFunction: 'ease',
  animationDelay: '0s',
  animationIterationCount: 1,
  animationDirection: 'normal',
  animationFillMode: 'none',
  // animationPlayState: 'running', // TODO - add play state when implemented
};

export default function UpdatingAnimationConfig() {
  const [animationConfig, setAnimationConfig] = useState<CSSAnimationConfig>({
    animationName: keyframes,
    ...DEFAULT_CONFIG,
  });

  const handleReset = useCallback(() => {
    setAnimationConfig((prev) => ({
      ...prev,
      ...DEFAULT_CONFIG,
    }));
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
          title="Updating Animation Config"
          description="Select one of predefined values for each of the animation properties and observe how the animation changes">
          <View style={styles.content}>
            <View style={styles.config}>
              {Object.entries(CONFIG_OPTIONS).map(([propertyName, options]) => {
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
              })}
            </View>

            <Animated.View style={styles.buttonRow} layout={LinearTransition}>
              <Text variant="label1">Reset config</Text>
              <Button title="Reset" onPress={handleReset} />
            </Animated.View>

            <Animated.View style={styles.preview} layout={LinearTransition}>
              <Animated.View style={[styles.box, animationConfig]} />
            </Animated.View>
          </View>
        </Section>

        <Section
          title="Animation Configuration"
          description="Selected animation configuration">
          <Animated.View style={styles.codeWrapper} layout={LinearTransition}>
            <CodeBlock code={JSON.stringify(animationConfig, null, 2)} />
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
  T extends keyof typeof CONFIG_OPTIONS
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    gap: spacing.sm,
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
