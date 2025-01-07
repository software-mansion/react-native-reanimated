import { faCog } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { colors, sizes, spacing } from '@/theme';
import type { RouteCardComponent } from '~/css/components';
import { RouteCard } from '~/css/components';
import { useFocusPlayState } from '~/css/hooks';

const TestExamplesCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Examples to test **edge cases**, **performance**, etc. (useful for devs)">
    <Showcase />
  </RouteCard>
);

const ANIMATION_DURATION = 6000;

function Showcase() {
  return (
    <View>
      <Animated.View
        style={[
          styles.cog,
          styles.cog1,
          { animationPlayState: useFocusPlayState() },
        ]}>
        <FontAwesomeIcon
          color={colors.primaryDark}
          icon={faCog}
          size={sizes.lg}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.cog,
          styles.cog2,
          { animationPlayState: useFocusPlayState() },
        ]}>
        <FontAwesomeIcon color={colors.primary} icon={faCog} size={sizes.md} />
      </Animated.View>
    </View>
  );
}

const rootateRight = css.keyframes({
  from: {
    transform: [{ rotate: '0deg' }],
  },
  to: {
    transform: [{ rotate: '360deg' }],
  },
});

const rootateLeft = css.keyframes({
  from: {
    transform: [{ rotate: '0deg' }],
  },
  to: {
    transform: [{ rotate: '-360deg' }],
  },
});

const styles = css.create({
  cog: {
    animationDuration: ANIMATION_DURATION,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
    position: 'absolute',
  },
  cog1: {
    animationName: rootateRight,
    left: -spacing.xl,
    top: -spacing.xxl + 1,
  },
  cog2: {
    animationDelay: -0.1175 * ANIMATION_DURATION,
    animationName: rootateLeft,
    left: spacing.xxs,
  },
});

export default TestExamplesCard;
