import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, sizes, spacing } from '@/theme';
import type { RouteCardComponent } from '~/css/components';
import { RouteCard } from '~/css/components';

const TransitionSettingsCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Customization options: **duration**, **delay**, **timing function** and more">
    <Showcase />
  </RouteCard>
);

const randRange = (min: number, max: number, count: number) =>
  Array.from({ length: count }, () => Math.random() * (max - min) + min);

const BARS_COUNT = 7;
const MIN_BAR_HEIGHT = sizes.xxxs;
const MAX_BAR_HEIGHT = sizes.md;

function Showcase() {
  const [barHeights, setBarHeights] = useState(
    Array.from({ length: BARS_COUNT }, () => 0)
  );

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        setBarHeights(randRange(MIN_BAR_HEIGHT, MAX_BAR_HEIGHT, BARS_COUNT));
      }, 250);

      const interval = setInterval(() => {
        const offsets = randRange(
          MIN_BAR_HEIGHT,
          MAX_BAR_HEIGHT / 2,
          BARS_COUNT
        );
        setBarHeights((prev) =>
          prev.map(
            (height, index) =>
              ((height + offsets[index] - MIN_BAR_HEIGHT) %
                (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT)) +
              MIN_BAR_HEIGHT
          )
        );
      }, 1500);

      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {barHeights.map((height, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height,
                transitionDelay: index * 75,
                transitionDuration: 300,
                transitionProperty: 'height',
                transitionTimingFunction: 'easeInOut',
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.horizontalLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.primary,
    width: sizes.xxxs,
  },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xxxs,
    height: sizes.md,
  },
  container: {
    gap: spacing.xxxs,
  },
  horizontalLine: {
    backgroundColor: colors.primary,
    height: 5,
  },
});

export default TransitionSettingsCard;
