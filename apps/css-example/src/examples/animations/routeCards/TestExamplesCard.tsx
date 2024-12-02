import { faCog } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { RouteCardComponent } from '@/components';
import { RouteCard } from '@/components';
import { useFocusPlayState } from '@/hooks';
import { colors, sizes, spacing } from '@/theme';

const TestExamplesCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Examples to test **edge cases**, **performance**, etc. (useful for devs)">
    <Showcase />
  </RouteCard>
);

const ANIMATION_DURATION = 6000;

const sharedAnimationSettings: CSSAnimationSettings = {
  animationDuration: ANIMATION_DURATION,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
};

const rotateRight: CSSAnimationProperties = {
  animationName: {
    from: {
      transform: [{ rotate: '0deg' }],
    },
    to: {
      transform: [{ rotate: '360deg' }],
    },
  },
  ...sharedAnimationSettings,
};

const rotateLeft: CSSAnimationProperties = {
  animationDelay: -0.1175 * ANIMATION_DURATION,
  animationName: {
    from: {
      transform: [{ rotate: '0deg' }],
    },
    to: {
      transform: [{ rotate: '-360deg' }],
    },
  },
  ...sharedAnimationSettings,
};

function Showcase() {
  return (
    <View>
      <Animated.View
        style={[
          styles.cog,
          styles.cog1,
          rotateRight,
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
          rotateLeft,
          { animationPlayState: useFocusPlayState() },
        ]}>
        <FontAwesomeIcon color={colors.primary} icon={faCog} size={sizes.md} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cog: {
    position: 'absolute',
  },
  cog1: {
    left: -spacing.xl,
    top: -spacing.xxl + 1,
  },
  cog2: {
    left: spacing.xxs,
  },
});

export default TestExamplesCard;
