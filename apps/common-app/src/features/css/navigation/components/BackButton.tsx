import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { memo, useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { colors, iconSizes, spacing } from '@/theme';
import { IS_WEB } from '@/utils';
import { Text } from '~/css/components';
import type { Route } from '~/css/navigation/types';
import { getScreenTitle } from '~/css/navigation/utils';

type BackButtonProps = {
  tabRoutes: Array<Route>;
};

const BackButton = memo(function BackButton({ tabRoutes }: BackButtonProps) {
  const navigation = useNavigation();
  const [prevRoute, setPrevRoute] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      return navigation.addListener('state', (e) => {
        const { index, routes } = e.data.state ?? {};
        setPrevRoute(routes?.[index - 1]?.key?.split('-')[0]);
      });
    }, [navigation])
  );

  const routeNamesSet = new Set(tabRoutes.map(({ name }) => name));
  const routes = navigation.getState()?.routes;
  if (!prevRoute || routes?.every((route) => routeNamesSet.has(route.name))) {
    return null;
  }

  return (
    <Pressable
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
      <Animated.View entering={FadeInRight}>
        <Text style={styles.backButtonText} variant="body1">
          {getScreenTitle(prevRoute)}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    marginLeft: IS_WEB ? spacing.md : 0,
    marginRight: spacing.xs,
    paddingTop: spacing.xxs,
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
