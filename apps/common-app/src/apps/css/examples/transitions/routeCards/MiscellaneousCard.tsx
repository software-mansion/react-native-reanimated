import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionProperty,
  StyleProps,
} from 'react-native-reanimated';
import Animated, { FadeInLeft, FadeOutRight } from 'react-native-reanimated';

import type { RouteCardComponent } from '@/apps/css/components';
import { RouteCard, Text } from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const MiscellaneousCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Changing **transition properties**, **transition settings** and so on">
    <Showcase />
  </RouteCard>
);

const TRANSITION_PROPERTIES: Array<CSSTransitionProperty> = [
  'all',
  ['width', 'height'],
  'width',
  'height',
  'none',
];

const TRANSITION_STYLES: Array<StyleProps> = [
  { backgroundColor: colors.primary, height: sizes.sm, width: sizes.sm },
  { backgroundColor: colors.primaryDark, height: sizes.lg, width: sizes.lg },
];

function Showcase() {
  const [transitionPropertyIndex, setTransitionPropertyIndex] = useState(0);
  const [styleIndex, setStyleIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        setStyleIndex(1);
      }, 250);

      const styleChangeInterval = setInterval(() => {
        setStyleIndex((prev) => (prev + 1) % TRANSITION_STYLES.length);
      }, 1500);
      const transitionPropertyInterval = setInterval(() => {
        setTransitionPropertyIndex(
          (prev) => (prev + 1) % TRANSITION_PROPERTIES.length
        );
      }, 3000);

      return () => {
        clearTimeout(timeout);
        clearInterval(styleChangeInterval);
        clearInterval(transitionPropertyInterval);
      };
    }, [])
  );

  const transitionProperty = TRANSITION_PROPERTIES[transitionPropertyIndex];

  return (
    <View style={styles.container}>
      <View style={styles.boxContainer}>
        <Animated.View
          style={[
            styles.box,
            TRANSITION_STYLES[styleIndex],
            {
              transitionDuration: 300,
              transitionProperty,
            },
          ]}
        />
      </View>
      <Animated.View
        entering={FadeInLeft}
        exiting={FadeOutRight}
        key={transitionPropertyIndex}>
        <Text variant="label3">
          {Array.isArray(transitionProperty)
            ? transitionProperty.join(', ')
            : transitionProperty}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  boxContainer: {
    ...flex.center,
    height: sizes.lg,
    width: sizes.lg,
  },
  container: {
    ...flex.center,
    gap: spacing.xxs,
  },
});

export default MiscellaneousCard;
