import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { CodeBlock, Text } from '../../../../../components';
import { colors, iconSizes, radius, spacing } from '../../../../../theme';
import { StyleSheet, View } from 'react-native';
import type { LayoutAnimation, StyleProps } from 'react-native-reanimated';
import Animated, {
  LinearTransition,
  FadeIn,
  FadeOut,
  withTiming,
  withDelay,
  FadeInRight,
  LayoutAnimationConfig,
} from 'react-native-reanimated';

const CARDS_ORDER_CHANGE_DELAY = 300;
const ACTIVE_BORDER_CHANGE_DELAY = 300;

const layoutTransition = LinearTransition.delay(CARDS_ORDER_CHANGE_DELAY);

export const ScaleDown = (): LayoutAnimation => {
  'worklet';
  const progress = withDelay(
    CARDS_ORDER_CHANGE_DELAY,
    withTiming(0, { duration: 200 })
  );
  const animations = {
    transform: [{ scale: progress }],
    opacity: progress,
  };
  const initialValues = {
    transform: [{ scale: 1 }],
    opacity: 1,
  };
  return {
    initialValues,
    animations,
  };
};

type TransitionStyleChangeProps = {
  transitionStyles: StyleProps[];
  activeStyleIndex: number;
};

export default function TransitionStyleChange({
  transitionStyles,
  activeStyleIndex,
}: TransitionStyleChangeProps) {
  const nextStyleIndex = (activeStyleIndex + 1) % transitionStyles.length;

  const activeStyle = transitionStyles[activeStyleIndex];
  const nextStyle = transitionStyles[nextStyleIndex];

  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View
        style={styles.container}
        layout={layoutTransition}
        exiting={FadeOut}>
        <CodeCard
          key={activeStyleIndex}
          code={JSON.stringify(activeStyle, null, 2)}
          label="Current"
          active
        />

        <Animated.View style={styles.iconWrapper} layout={layoutTransition}>
          <FontAwesomeIcon
            icon={faArrowRight}
            size={iconSizes.md}
            color={colors.primary}
          />
        </Animated.View>

        <CodeCard
          key={nextStyleIndex}
          code={JSON.stringify(nextStyle, null, 2)}
          label="Next"
        />
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

type CodeCardProps = {
  code: string;
  label?: string;
  active?: boolean;
  onFinish?: () => void;
};

function CodeCard({ code, active, label }: CodeCardProps) {
  return (
    <Animated.View
      layout={layoutTransition}
      style={[styles.codeCardWrapper, { zIndex: active ? 1 : 0 }]}>
      {label && (
        <Animated.View
          style={styles.labelWrapper}
          entering={FadeInRight.delay(CARDS_ORDER_CHANGE_DELAY)}
          exiting={FadeOut}>
          <Text variant="label3">{label}</Text>
        </Animated.View>
      )}
      <View>
        {active && (
          <Animated.View
            style={styles.activeCardBackground}
            entering={FadeIn.delay(ACTIVE_BORDER_CHANGE_DELAY)}
            exiting={FadeOut.delay(ACTIVE_BORDER_CHANGE_DELAY)}
          />
        )}
        <Animated.View
          style={styles.codeBlock}
          exiting={ScaleDown}
          entering={FadeIn.delay(CARDS_ORDER_CHANGE_DELAY)}>
          <CodeBlock scrollable={false} code={code} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  iconWrapper: {
    paddingTop: spacing.md,
  },
  codeCardWrapper: {
    flexGrow: 1,
  },
  labelWrapper: {
    marginBottom: spacing.xxs,
    paddingLeft: spacing.xxs,
  },
  activeCardBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  codeBlock: {
    borderRadius: radius.sm,
    backgroundColor: colors.background2,
    padding: spacing.xs,
    margin: spacing.xxs,
  },
});
