import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { colors, fonts } from './theme';

export const NATIVE_HEADER: NativeStackNavigationOptions = {
  headerTransparent: true,
  headerTintColor: colors.navy,
  headerTitleStyle: { fontFamily: fonts.medium, color: colors.navy },
  headerLargeTitleStyle: { fontFamily: fonts.bold, color: colors.navy },
  headerBackButtonDisplayMode: 'minimal',
};
