import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  css,
  FadeInLeft,
  FadeOutRight,
} from 'react-native-reanimated';

import type { RouteCardComponent } from '@/components';
import { RouteCard, Text } from '@/components';
import { colors, radius, sizes, spacing } from '@/theme';

const MiscellaneousCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="**Changing** animation, animation **settings updates** and so on">
    <Showcase />
  </RouteCard>
);

const ANIMATION_DURATION = 1500;

const roll = css.keyframes({
  to: {
    transform: [{ rotate: '360deg' }],
  },
});

const color = css.keyframes({
  '50%': {
    backgroundColor: colors.primaryDark,
  },
});

const fade = css.keyframes({
  '50%': {
    opacity: 0,
  },
});

const animations = [
  { animation: roll, name: 'Roll' },
  { animation: color, name: 'Color' },
  { animation: fade, name: 'Fade' },
];

function Showcase() {
  const [animationIndex, setAnimationIndex] = useState(0);

  const { animation, name: animationName } = animations[animationIndex];
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
    }
    lastIterationElapsedTimeRef.current =
      Date.now() - lastIterationStartTimestampRef.current;
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: animation,
            animationPlayState: isFocused ? 'running' : 'paused',
          },
        ]}
      />
      <Animated.View
        entering={FadeInLeft}
        exiting={FadeOutRight}
        key={animationName}>
        <Text variant="label3">{animationName}</Text>
      </Animated.View>
    </View>
  );
}

const styles = css.create({
  box: {
    animationDuration: ANIMATION_DURATION,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'easeInOut',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  container: {
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingTop: spacing.lg,
  },
});

export default MiscellaneousCard;
