import { useCallback, useState } from 'react';
import type { RouteCardComponent } from '../../../components';
import { RouteCard } from '../../../components';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, sizes, spacing } from '../../../theme';
import Animated from 'react-native-reanimated';

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
                transitionProperty: 'height',
                transitionDuration: 300,
                transitionDelay: index * 75,
                transitionTimingFunction: 'easeInOut',
                height,
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
  container: {
    gap: spacing.xxxs,
  },
  horizontalLine: {
    height: 5,
    backgroundColor: colors.primary,
  },
  bars: {
    flexDirection: 'row',
    gap: spacing.xxxs,
    height: sizes.md,
    alignItems: 'flex-end',
  },
  bar: {
    width: sizes.xxxs,
    backgroundColor: colors.primary,
  },
});

export default TransitionSettingsCard;
