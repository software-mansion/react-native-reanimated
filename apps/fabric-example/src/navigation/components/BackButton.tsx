import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { spacing, colors, iconSizes } from '../../theme';
import { getScreenTitle } from '../utils';
import { Text } from '../../components';
import type { Route } from '../types';

type BackButtonProps = {
  tabRoutes: Route[];
};

const BackButton = memo(function BackButton({ tabRoutes }: BackButtonProps) {
  const navigation = useNavigation();

  const state = navigation.getState();
  if (!state) {
    return null;
  }

  const { index, routes } = state;
  const prevRoute = routes[index - 1];
  const routeNamesSet = new Set(tabRoutes.map(({ name }) => name));

  if (!prevRoute || routes.every((route) => routeNamesSet.has(route.name))) {
    return null;
  }

  return (
    <TouchableOpacity
      hitSlop={spacing.md}
      style={styles.backButton}
      onPress={() => {
        navigation.goBack();
      }}>
      <FontAwesomeIcon
        color={colors.primary}
        icon={faChevronLeft}
        size={iconSizes.xs}
      />
      <Animated.View entering={FadeInRight} exiting={FadeInLeft}>
        <Text style={styles.backButtonText} variant="body1">
          {getScreenTitle(prevRoute.name)}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  backButtonText: {
    color: colors.primary,
  },
  content: {
    backgroundColor: colors.background3,
  },
  scrollViewContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});

export default BackButton;
