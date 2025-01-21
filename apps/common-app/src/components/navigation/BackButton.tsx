import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { Text } from '@/apps/css/components';
import { getScreenTitle } from '@/apps/css/navigation/utils';
import { colors, iconSizes, spacing } from '@/theme';
import { IS_WEB } from '@/utils';

function BackButton() {
  const navigation = useNavigation();

  const routes = navigation.getState()?.routes;
  const prevRouteName = routes?.[routes.length - 2]?.name;

  if (!prevRouteName || !navigation.canGoBack()) {
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
        size={iconSizes.sm}
      />
      <Animated.View entering={FadeInRight}>
        <Text style={styles.backButtonText} variant="body1">
          {getScreenTitle(prevRouteName)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

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
});

export default memo(BackButton);
