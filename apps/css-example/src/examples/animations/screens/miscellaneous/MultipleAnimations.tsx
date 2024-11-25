import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationKeyframes,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { Button, ScrollScreen, Section, Stagger } from '@/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const sharedConfig: CSSAnimationSettings = {
  animationDuration: '3s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
};

const rollAnimation: CSSAnimationKeyframes = {
  to: {
    transform: [{ rotate: '360deg' }],
  },
};

const colorAnimation: CSSAnimationKeyframes = {
  '0, 1': {
    backgroundColor: colors.primary,
  },
  0.33: {
    backgroundColor: colors.primaryLight,
  },
  0.66: {
    backgroundColor: colors.primaryDark,
  },
};

const sizeAnimation: CSSAnimationKeyframes = {
  '25%': {
    width: sizes.xl,
  },
  '50%': {
    height: sizes.xl,
    width: sizes.xl,
  },
  '75%': {
    height: sizes.xl,
  },
};

const ANIMATIONS = [
  { animation: rollAnimation, name: 'Roll' },
  { animation: colorAnimation, name: 'Color' },
  { animation: sizeAnimation, name: 'Size' },
];

export default function MultipleAnimations() {
  const [selectedIndexes, setSelectedIndexes] = useState<Array<number>>([]);

  const animation = {
    animationName: selectedIndexes.map((index) => ANIMATIONS[index].animation),
    ...sharedConfig,
  };

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          title="Multiple Animations"
          description="This example demonstrates how to apply **multiple animations** to a single element. It also allows selecting **separate animation settings** or **sharing them** across all animations.
        ">
          <View style={styles.buttons}>
            {ANIMATIONS.map((item, index) => (
              <Button
                key={index}
                style={flex.grow}
                title={item.name}
                onPress={() =>
                  setSelectedIndexes((indexes) => {
                    if (indexes.includes(index)) {
                      return indexes.filter((i) => i !== index);
                    }
                    return [...indexes, index];
                  })
                }
              />
            ))}
          </View>

          <View style={styles.preview}>
            <Animated.View style={[styles.box, animation]} />
          </View>
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
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    justifyContent: 'space-between',
  },
  preview: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
  },
});
