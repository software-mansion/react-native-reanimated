import type { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';

import { IS_MACOS } from './platform';

export function createStack<
  RootStackParamList extends ParamListBase = ParamListBase,
>() {
  return IS_MACOS
    ? createStackNavigator<RootStackParamList>()
    : createNativeStackNavigator<RootStackParamList>();
}
