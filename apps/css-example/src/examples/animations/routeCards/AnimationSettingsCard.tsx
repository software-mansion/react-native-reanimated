import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationDelay,
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { RouteCardComponent } from '@/components';
import { RouteCard } from '@/components';
import { useFocusPlayState } from '@/hooks';
import { colors, radius, sizes, spacing } from '@/theme';

const animationSettings: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '2s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'easeInOut',
};

const thumbAnimation: CSSAnimationProperties = {
  animationName: {
    to: {
      top: '100%',
    },
  },
  ...animationSettings,
};

const trackInnerAnimation: CSSAnimationProperties = {
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
  bar: {
    alignItems: 'center',
    height: sizes.lg,
    width: sizes.xxxs,
  },
  barThumb: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    height: sizes.xxxs,
    position: 'absolute',
    transform: [{ translateY: '-50%' }],
    width: sizes.xxxs,
  },
  barTrack: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    height: '100%',
    width: '50%',
  },
  barTrackInner: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'center',
  },
});

export default AnimationSettingsCard;
