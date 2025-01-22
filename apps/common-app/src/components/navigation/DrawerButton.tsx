import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { colors, iconSizes, spacing } from '@/theme';
import { IS_WEB } from '@/utils';

export default function DrawerButton() {
  const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();

  return (
    <Pressable
      style={styles.drawerButton}
      onPress={() => navigation.openDrawer()}>
      <FontAwesomeIcon
        color={colors.primary}
        icon={faBars}
        size={iconSizes.md}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  drawerButton: {
    padding: IS_WEB ? spacing.lg : spacing.xs,
  },
});
