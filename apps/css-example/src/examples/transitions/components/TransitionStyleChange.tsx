import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutAnimation, StyleProps } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { CodeBlock, Text } from '@/components';
import { colors, flex, iconSizes, radius, spacing } from '@/theme';
import { stringifyConfig } from '@/utils';

const CARDS_ORDER_CHANGE_DELAY = 300;

const layoutTransition = LinearTransition.delay(CARDS_ORDER_CHANGE_DELAY);

const ScaleDown = (): LayoutAnimation => {
  'worklet';
  const progress = withDelay(
    CARDS_ORDER_CHANGE_DELAY,
    withTiming(0, { duration: 200 })
  );
  const animations = {
    opacity: progress,
    transform: [{ scale: progress }],
  };
  const initialValues = {
    opacity: 1,
    transform: [{ scale: 1 }],
  };
  return {
    animations,
    initialValues,
  };
};

type TransitionStyleChangeProps = {
  transitionStyles: Array<StyleProps>;
  activeStyleIndex: number;
};

function TransitionStyleChange({
  activeStyleIndex,
  transitionStyles,
}: TransitionStyleChangeProps) {
  const nextStyleIndex = (activeStyleIndex + 1) % transitionStyles.length;

  const activeStyle = transitionStyles[activeStyleIndex];
  const nextStyle = transitionStyles[nextStyleIndex];

  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.ScrollView
        contentContainerStyle={styles.container}
        exiting={FadeOut}
        layout={layoutTransition}
        horizontal>
        <CodeCard
          code={stringifyConfig(activeStyle)}
          key={activeStyleIndex}
          label="Current"
          active
        />

        <Animated.View layout={layoutTransition} style={styles.iconWrapper}>
          <FontAwesomeIcon
            color={colors.primary}
            icon={faArrowRight}
            size={iconSizes.md}
          />
        </Animated.View>

        <CodeCard
          code={stringifyConfig(nextStyle)}
          key={nextStyleIndex}
          label="Next"
        />
      </Animated.ScrollView>
    </LayoutAnimationConfig>
  );
}

type CodeCardProps = {
  code: string;
  label?: string;
  active?: boolean;
  onFinish?: () => void;
};

function CodeCard({ active, code, label }: CodeCardProps) {
  return (
    <Animated.View
      layout={layoutTransition}
      style={[styles.codeCardWrapper, { zIndex: active ? 1 : 0 }]}>
      {label && (
        <Animated.View
          entering={FadeInRight.delay(CARDS_ORDER_CHANGE_DELAY)}
          exiting={FadeOut}
          style={styles.labelWrapper}>
          <Text variant="label3">{label}</Text>
        </Animated.View>
      )}
      <View>
        {active && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.activeCardBackground}
          />
        )}
        <LayoutAnimationConfig skipEntering={active}>
          <Animated.View
            entering={FadeIn.delay(CARDS_ORDER_CHANGE_DELAY)}
            exiting={ScaleDown}
            style={styles.codeBlock}>
            <CodeBlock code={code} scrollable={false} />
          </Animated.View>
        </LayoutAnimationConfig>
      </View>
    </Animated.View>
  );
}

export default memo(TransitionStyleChange);

const styles = StyleSheet.create({
  activeCardBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  codeBlock: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    margin: spacing.xxs,
    padding: spacing.xs,
  },
  codeCardWrapper: {
    flexGrow: 1,
  },
  container: {
    flexDirection: 'row',
    ...flex.center,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  iconWrapper: {
    paddingTop: spacing.md,
  },
  labelWrapper: {
    marginBottom: spacing.xxs,
    paddingLeft: spacing.xxs,
  },
});
