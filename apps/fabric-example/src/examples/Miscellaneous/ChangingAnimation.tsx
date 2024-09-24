import { View, StyleSheet } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import {
  Button,
  CodeBlock,
  Scroll,
  Section,
  Stagger,
  Text,
} from '../../components';
import { colors, radius, sizes, spacing } from '../../theme';
import Animated, {
  cubicBezier,
  LinearTransition,
} from 'react-native-reanimated';
import { useState } from 'react';
import { formatAnimationCode } from '../../utils';

const sharedConfig: CSSAnimationSettings = {
  animationDuration: '1s',
  animationTimingFunction: 'easeInOut',
  animationIterationCount: 'infinite',
};

const wiggleAnimation: CSSAnimationConfig = {
  animationName: {
    '25%': {
      transform: [{ rotate: '-15deg' }],
    },
    '75%': {
      transform: [{ rotate: '15deg' }],
    },
  },
  ...sharedConfig,
  animationDuration: '0.5s',
  animationTimingFunction: cubicBezier(0.5, -0.6, 0.6, 1.5),
};

const fadeAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      opacity: 0,
    },
  },
  ...sharedConfig,
};

const colorAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      backgroundColor: colors.primaryDark,
    },
  },
  ...sharedConfig,
};

const jumpAnimation: CSSAnimationConfig = {
  animationName: {
    '50%': {
      top: '-50%',
      transform: [{ translateY: '50%' }],
    },
  },
  ...sharedConfig,
};

const rollAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      transform: [{ rotate: '360deg' }],
    },
  },
  ...sharedConfig,
};

const ANIMATIONS = [
  { name: 'Wiggle', animation: wiggleAnimation },
  { name: 'Fade', animation: fadeAnimation },
  { name: 'Color', animation: colorAnimation },
  { name: 'Jump', animation: jumpAnimation },
  { name: 'Roll', animation: rollAnimation },
];

export default function ChangingAnimation() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);

  const animation =
    selectedIndex !== null ? ANIMATIONS[selectedIndex].animation : null;

  return (
    <Scroll>
      <Stagger>
        <Section
          title="Changing Animation"
          description="Select one of the predefined animations and see that the box animation changes to the selected one.">
          <View style={styles.content}>
            <View style={styles.buttonRow}>
              <Text variant="label1">Remove animation</Text>
              <Button
                title="Remove"
                onPress={() => setSelectedIndex(null)}
                disabled={!animation}
              />
            </View>

            <View style={styles.buttons}>
              {ANIMATIONS.map((item, index) => (
                <Button
                  key={index}
                  title={item.name}
                  onPress={() => setSelectedIndex(index)}
                  disabled={selectedIndex === index}
                />
              ))}
            </View>

            <View style={styles.preview}>
              <Animated.View style={[styles.box, animation]} />
            </View>
          </View>
        </Section>

        <Section
          title="Animation Configuration"
          description="Selected animation configuration">
          <Animated.View style={styles.codeWrapper} layout={LinearTransition}>
            {animation ? (
              <CodeBlock code={formatAnimationCode(animation)} />
            ) : (
              <Text variant="subHeading2">No animation selected</Text>
            )}
          </Animated.View>
        </Section>
      </Stagger>
    </Scroll>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
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
