import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated, { css, LinearTransition } from 'react-native-reanimated';

import { colors, flex, radius, sizes, spacing } from '@/theme';
import {
  Button,
  CodeBlock,
  ScrollScreen,
  Section,
  Stagger,
  Text,
} from '~/css/components';
import { stringifyConfig } from '~/css/utils';

const animationSettings: CSSAnimationSettings = {
  animationDuration: '1s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'easeInOut',
};

const wiggle = css.keyframes({
  '0%, 100%': {
    transform: [{ rotate: '-15deg' }],
  },
  '50%': {
    transform: [{ rotate: '15deg' }],
  },
});

const fade = css.keyframes({
  to: {
    opacity: 0,
  },
});

const color = css.keyframes({
  to: {
    backgroundColor: colors.primaryDark,
  },
});

const jump = css.keyframes({
  '50%': {
    top: '-50%',
    transform: [{ translateY: '50%' }],
  },
});

const roll = css.keyframes({
  to: {
    transform: [{ rotate: '360deg' }],
  },
});

const ANIMATIONS: Array<{ name: string } & CSSAnimationProperties> = [
  { animationDuration: '0.5s', animationName: wiggle, name: 'Wiggle' },
  { animationName: fade, name: 'Fade' },
  { animationName: color, name: 'Color' },
  { animationName: jump, name: 'Jump' },
  { animationName: roll, name: 'Roll' },
];

export default function ChangingAnimation() {
  const [selectedIndex, setSelectedIndex] = useState<null | number>(0);

  const { name, ...animationProps } =
    selectedIndex !== null ? ANIMATIONS[selectedIndex] : { name: undefined };

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          description="Select **one of** the predefined **animations** and see that the box **animation changes** to the selected one."
          title="Changing Animation">
          <View style={styles.content}>
            <View style={styles.buttonRow}>
              <Text variant="label1">Remove animation</Text>
              <Button
                disabled={!name}
                title="Remove"
                onPress={() => setSelectedIndex(null)}
              />
            </View>

            <View style={styles.buttons}>
              {ANIMATIONS.map((item, index) => (
                <Button
                  disabled={selectedIndex === index}
                  key={index}
                  style={flex.grow}
                  title={item.name}
                  onPress={() => setSelectedIndex(index)}
                />
              ))}
            </View>

            <View style={styles.preview}>
              <Animated.View
                style={[styles.box, animationSettings, animationProps]}
              />
            </View>
          </View>
        </Section>

        <Section
          description="Selected animation configuration"
          title="Animation Configuration">
          <Animated.View layout={LinearTransition} style={styles.codeWrapper}>
            {name ? (
              <CodeBlock
                code={stringifyConfig({
                  ...animationSettings,
                  ...animationProps,
                })}
              />
            ) : (
              <Text variant="subHeading2">No animation selected</Text>
            )}
          </Animated.View>
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    justifyContent: 'space-between',
  },
  codeWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  content: {
    gap: spacing.xs,
  },
  preview: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
  },
});
