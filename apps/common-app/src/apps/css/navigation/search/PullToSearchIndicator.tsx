import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';

import { Text } from '@/apps/css/components';
import { colors, iconSizes, radius, spacing } from '@/theme';

import { usePullToSearch } from './PullToSearchProvider';

export default function PullToSearchIndicator() {
  const { setPullToSearchShown } = usePullToSearch();

  useEffect(() => {
    setTimeout(() => {
      setPullToSearchShown(true);
    }, 5000);
  }, [setPullToSearchShown]);

  return (
    <Animated.View
      entering={SlideInUp.duration(1000)}
      exiting={SlideOutUp.duration(1000)}
      style={styles.container}>
      <View style={styles.pullToSearchBadge}>
        <FontAwesomeIcon
          color={colors.foreground1}
          icon={faSearch}
          size={iconSizes.sm}
        />
        <Text variant="label1">Pull down to search</Text>
      </View>
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
    zIndex: 1000,
  },
  pullToSearchBadge: {
    alignItems: 'center',
    backgroundColor: colors.background1,
    borderRadius: radius.full,
    boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.15)',
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
  },
});
