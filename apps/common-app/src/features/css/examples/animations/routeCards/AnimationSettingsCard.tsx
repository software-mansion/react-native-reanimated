import { View } from 'react-native';
import type {
  CSSAnimationDelay,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated, { css } from 'react-native-reanimated';

import { colors, radius, sizes, spacing } from '@/theme';
import type { RouteCardComponent } from '~/css/components';
import { RouteCard } from '~/css/components';
import { useFocusPlayState } from '~/css/hooks';

const animationSettings: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '2s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'easeInOut',
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
                  { animationDelay, animationPlayState },
                ]}
              />
            </View>
            <Animated.View
              style={[styles.barThumb, { animationDelay, animationPlayState }]}
            />
          </View>
        );
      })}
    </View>
  );
}

const barTrackInner = css.keyframes({
  from: {
    height: 0,
  },
  to: {
    height: '100%',
  },
});

const thumb = css.keyframes({
  from: {
    top: 0,
  },
  to: {
    top: '100%',
  },
});

const styles = css.create({
  bar: {
    alignItems: 'center',
    height: sizes.lg,
    width: sizes.xxxs,
  },
  barThumb: {
    animationName: thumb,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    height: sizes.xxxs,
    position: 'absolute',
    transform: [{ translateY: '-50%' }],
    width: sizes.xxxs,
    ...animationSettings,
  },
  barTrack: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    height: '100%',
    width: '50%',
  },
  barTrackInner: {
    animationName: barTrackInner,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: '100%',
    ...animationSettings,
  },
  container: {
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'center',
  },
});

export default AnimationSettingsCard;
