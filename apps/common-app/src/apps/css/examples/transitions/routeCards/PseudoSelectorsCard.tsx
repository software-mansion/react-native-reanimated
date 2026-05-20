import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { RouteCardComponent } from '@/apps/css/components';
import { RouteCard } from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

const PseudoSelectorsCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Animate views in response to **hover**, **press**, and **focus** events">
    <Showcase />
  </RouteCard>
);

function Showcase() {
  const [hovered, setHovered] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => setHovered(true), 300);
      const interval = setInterval(() => setHovered((prev) => !prev), 1500);
      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <View style={styles.row}>
      {[colors.primary, colors.primaryDark, '#6c63ff'].map((color, i) => (
        <Animated.View
          key={color}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: hovered ? 1 : 0.5,
              transform: [{ scale: hovered && i === 1 ? 1.3 : 1 }],
              transitionDuration: `${150 + i * 60}ms`,
              transitionTimingFunction: 'ease-in-out',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: radius.full,
    height: sizes.xs,
    width: sizes.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
});

export default PseudoSelectorsCard;
