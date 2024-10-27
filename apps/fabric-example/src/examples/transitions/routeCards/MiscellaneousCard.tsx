import type {
  CSSTransitionProperty,
  StyleProps,
} from 'react-native-reanimated';
import type { RouteCardComponent } from '../../../components';
import { RouteCard, Text } from '../../../components';
import { useCallback, useState } from 'react';
import { colors, flex, radius, sizes, spacing } from '../../../theme';
import Animated, { FadeInLeft, FadeOutRight } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const MiscellaneousCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Changing **transition properties**, **transition settings** and more">
    <Showcase />
  </RouteCard>
);

const TRANSITION_PROPERTIES: CSSTransitionProperty[] = [
  'all',
  ['width', 'height'],
  'width',
  'height',
  'none',
];

const TRANSITION_STYLES: StyleProps[] = [
  { width: sizes.sm, height: sizes.sm, backgroundColor: colors.primary },
  { width: sizes.lg, height: sizes.lg, backgroundColor: colors.primaryDark },
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
              transitionProperty,
              transitionDuration: 300,
            },
          ]}
        />
      </View>
      <Animated.View
        key={transitionPropertyIndex}
        entering={FadeInLeft}
        exiting={FadeOutRight}>
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
  container: {
    ...flex.center,
    gap: spacing.xxs,
  },
  boxContainer: {
    ...flex.center,
    width: sizes.lg,
    height: sizes.lg,
  },
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
});

export default MiscellaneousCard;
