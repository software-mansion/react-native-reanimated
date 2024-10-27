import { StyleSheet, View } from 'react-native';
import type { RouteCardComponent } from '../../../components';
import { RouteCard } from '../../../components';
import { colors, radius, sizes, spacing } from '../../../theme';
import type {
  CSSAnimationConfig,
  CSSAnimationDelay,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useFocusPlayState } from '../../../hooks';

const animationSettings: CSSAnimationSettings = {
  animationDuration: '2s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'easeInOut',
  animationDirection: 'alternate',
};

const thumbAnimation: CSSAnimationConfig = {
  animationName: {
    to: {
      top: '100%',
    },
  },
  ...animationSettings,
};

const trackInnerAnimation: CSSAnimationConfig = {
  animationName: {
    from: {
      height: 0,
    },
    to: {
      height: '100%',
    },
  },
  ...animationSettings,
};

const AnimationSettingsCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Customization options: **duration**, **timing**, **delay**, and more">
    <Showcase />
  </RouteCard>
);

function Showcase() {
  const animationPlayState = useFocusPlayState();

  return (
    <View style={styles.container}>
      {Array.from({ length: 6 }).map((_, index) => {
        const animationDelay: CSSAnimationDelay = `${-(6 - index) * 100}ms`;

        return (
          <View key={index} style={styles.bar}>
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barTrackInner,
                  trackInnerAnimation,
                  { animationDelay, animationPlayState },
                ]}
              />
            </View>
            <Animated.View
              style={[
                styles.barThumb,
                thumbAnimation,
                { animationDelay, animationPlayState },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  bar: {
    height: sizes.lg,
    width: sizes.xxxs,
    alignItems: 'center',
  },
  barTrack: {
    height: '100%',
    width: '50%',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
  },
  barTrackInner: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: '100%',
  },
  barThumb: {
    position: 'absolute',
    transform: [{ translateY: '-50%' }],
    width: sizes.xxxs,
    height: sizes.xxxs,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
  },
});

export default AnimationSettingsCard;
