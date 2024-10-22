import { StyleSheet, View } from 'react-native';
import type { RouteCardComponent } from '../../../components';
import { RouteCard, Text } from '../../../components';
import Animated, { FadeInLeft, FadeOutRight } from 'react-native-reanimated';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import { colors, radius, sizes, spacing } from '../../../theme';
import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

const MiscellaneousCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Changing animation, animation settings updates and more">
    <Showcase />
  </RouteCard>
);

const ANIMATION_DURATION = 1500;

const sharedConfig: CSSAnimationSettings = {
  animationDuration: ANIMATION_DURATION,
  animationTimingFunction: 'easeInOut',
  animationIterationCount: 'infinite',
};

const rollAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      transform: [{ rotate: '360deg' }],
    },
  },
  ...sharedConfig,
};

const colorAnimation: CSSAnimationConfig = {
  animationName: {
    '50%': {
      backgroundColor: colors.primaryDark,
    },
  },
  ...sharedConfig,
};

const fadeAnimation: CSSAnimationConfig = {
  animationName: {
    '50%': {
      opacity: 0,
    },
  },
  ...sharedConfig,
};

const animations = [
  { name: 'Roll', animation: rollAnimation },
  { name: 'Color', animation: colorAnimation },
  { name: 'Fade', animation: fadeAnimation },
];

function Showcase() {
  const [animationIndex, setAnimationIndex] = useState(0);

  const { name: animationName, animation } = animations[animationIndex];
  const isFocused = useIsFocused();
  const lastIterationStartTimestampRef = useRef(0);
  const lastIterationElapsedTimeRef = useRef(0);

  useEffect(() => {
    if (isFocused) {
      // This timeout/interval logic ensures that the animation will be always changed
      // after 2 iterations, even if the user left the screen during the iteration and
      // came back later (the animation will be resumed at the same point as it was
      // stopped and changed until the second iteration completes)
      let interval: NodeJS.Timeout;
      let timeout: NodeJS.Timeout;

      const changeAnimation = () => {
        setAnimationIndex((prev) => (prev + 1) % animations.length);
      };

      const startInterval = () => {
        interval = setInterval(() => {
          lastIterationStartTimestampRef.current = Date.now();
          changeAnimation();
        }, 2 * ANIMATION_DURATION);
      };

      if (lastIterationElapsedTimeRef.current > 0) {
        timeout = setTimeout(() => {
          changeAnimation();
          startInterval();
        }, ANIMATION_DURATION - lastIterationElapsedTimeRef.current);
      } else {
        startInterval();
      }

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      lastIterationElapsedTimeRef.current =
        Date.now() - lastIterationStartTimestampRef.current;
    }
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          animation,
          { animationPlayState: isFocused ? 'running' : 'paused' },
        ]}
      />
      <Animated.View
        key={animationName}
        entering={FadeInLeft}
        exiting={FadeOutRight}>
        <Text variant="label3">{animationName}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
});

export default MiscellaneousCard;
