import { StyleSheet, View } from 'react-native';
import { RouteCard } from '../../../components';
import type { RouteCardComponent } from '../../../components';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons';
import { colors, sizes, spacing } from '../../../theme';
import { useFocusPlayState } from './utils';

const TestExamplesCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Examples to test edge cases, performance, etc. (useful for devs)">
    <Showcase />
  </RouteCard>
);

const ANIMATION_DURATION = 6000;

const sharedAnimationSettings: CSSAnimationSettings = {
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
  animationDuration: ANIMATION_DURATION,
};

const rotateRight: CSSAnimationConfig = {
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

const rotateLeft: CSSAnimationConfig = {
  animationName: {
    from: {
      transform: [{ rotate: '0deg' }],
    },
    to: {
      transform: [{ rotate: '-360deg' }],
    },
  },
  animationDelay: -0.1175 * ANIMATION_DURATION,
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
          icon={faCog}
          size={sizes.lg}
          color={colors.primaryDark}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.cog,
          styles.cog2,
          rotateLeft,
          { animationPlayState: useFocusPlayState() },
        ]}>
        <FontAwesomeIcon icon={faCog} size={sizes.md} color={colors.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cog: {
    position: 'absolute',
  },
  cog1: {
    top: -spacing.xxl + 1,
    left: -spacing.xl,
  },
  cog2: {
    left: spacing.xxs,
  },
});

export default TestExamplesCard;
