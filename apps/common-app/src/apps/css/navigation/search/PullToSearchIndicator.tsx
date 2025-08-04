import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/apps/css/components';
import { spacing } from '@/theme';

type PullToSearchIndicatorProps = {
  show: SharedValue<boolean>;
};

export default function PullToSearchIndicator({
  show,
}: PullToSearchIndicatorProps) {
  const progress = useDerivedValue(() =>
    withTiming(show.value ? 1 : 0, {
      easing: Easing.inOut(Easing.ease),
    })
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [{ scale: (1 + progress.value) / 2 }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <FontAwesomeIcon icon={faSearch} />
      <Text variant="heading3">Pull down to search</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    left: 0,
    paddingVertical: spacing.lg,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
