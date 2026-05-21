import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import Animated from 'react-native-reanimated';

import { withSharedTransitionBoundary } from '../withSharedTransitionBoundary';
import {
  BackgroundColorSourceSection,
  BackgroundColorTargetRoute,
  BackgroundColorTargetScreen,
} from './BackgroundColor';
import {
  BasicSourceSection,
  BasicTargetRoute,
  BasicTargetScreen,
} from './BasicCustom';
import {
  BorderRadiusSourceSection,
  BorderRadiusTargetRoute,
  BorderRadiusTargetScreen,
} from './BorderRadius';
import {
  GlobalOriginSourceSection,
  GlobalOriginTargetRoute,
  GlobalOriginTargetScreen,
  OriginTargetRoute,
  OriginTargetScreen,
} from './GlobalOrigin';
import {
  ProgressSourceSection,
  ProgressTargetRoute,
  ProgressTargetScreen,
} from './ProgressAnimation';
import { styles } from './styles';

function MenuContent({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const navigate = (route: string) => navigation.navigate(route);
  return (
    <Animated.ScrollView style={styles.flexOne}>
      <BasicSourceSection navigate={navigate} />
      <ProgressSourceSection navigate={navigate} />
      <BorderRadiusSourceSection navigate={navigate} />
      <GlobalOriginSourceSection navigate={navigate} />
      <BackgroundColorSourceSection navigate={navigate} />
    </Animated.ScrollView>
  );
}

const Menu = withSharedTransitionBoundary(MenuContent);

export default function CustomTransitionExample() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name='Menu'
        component={Menu}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={BasicTargetRoute}
        component={BasicTargetScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ProgressTargetRoute}
        component={ProgressTargetScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={BorderRadiusTargetRoute}
        component={BorderRadiusTargetScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={GlobalOriginTargetRoute}
        component={GlobalOriginTargetScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={OriginTargetRoute}
        component={OriginTargetScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={BackgroundColorTargetRoute}
        component={BackgroundColorTargetScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
