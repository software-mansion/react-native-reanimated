import React from 'react';
import { FlatList, LogBox, View } from 'react-native';

import { ScrollView } from 'react-native-gesture-handler';

import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

import { styles, ItemSeparator, MainScreenItem } from '../src/App';

import SimpleTest from './SimpleTest';
import MeasureTest from './MeasureTest';
import FastRefreshTest from './FastRefreshTest';
import ScrollToTest from './scrollToTest';
import AnimatedReactionTest from './AnimatedReactionTest';
import AnimationsTest from './Animations';
import UpdatePropsTest from './UpdatePropsTest';
import AdaptersTest from './AdaptersTest';
import TransformsTest from './TransformsTest';
import CustomLayout2 from './CustomLayout2';
import CustomLayout3 from './CustomLayout3';
import ModalInNavigation from './ModalInNavigation';
import ModalInNavigationNativeStack from './ModalInNavigationNativeStack';
import WithNavigation from './WithNavigation';
import WithNavigationNested from './WithNavigationNested';
import TestRemovalOrder from './TestRemovalOrder';
import LayoutAnimationsRemovalTest from './LayoutAnimationsRemovalTest';

LogBox.ignoreLogs(['Calling `getNode()`']);

const SCREENS = {
  LayoutAnimationsRemovalTest: {
    screen: LayoutAnimationsRemovalTest,
    title: 'test exiting animations',
  },
  TestRemovalOrder: {
    screen: TestRemovalOrder,
    title: 'test removal Order',
  },
  SimpleTest: {
    screen: SimpleTest,
    title: '🆕 Simple test',
  },
  MeasureTest: {
    screen: MeasureTest,
    title: '🆕 Measure test',
  },
  FastRefreshTest: {
    screen: FastRefreshTest,
    title: '🆕 Fast refresh test',
  },
  ScrollToTest: {
    screen: ScrollToTest,
    title: '🆕 ScrollTo test',
  },
  AnimatedReactionTest: {
    screen: AnimatedReactionTest,
    title: '🆕 Animated reaction test',
  },
  AnimationsTest: {
    screen: AnimationsTest,
    title: '🆕 Animations',
  },
  UpdatePropsTest: {
    screen: UpdatePropsTest,
    title: '🆕 Update Props',
  },
  AdaptersTest: {
    screen: AdaptersTest,
    title: '🆕 Adapters',
  },
  TransformsTest: {
    screen: TransformsTest,
    title: '🆕 Transforms',
  },
  CustomLayout2: {
    screen: CustomLayout2,
    title: '🆕 Custom Layout - switch to layout animation',
  },
  CustomLayout3: {
    screen: CustomLayout3,
    title: '🆕 Custom Layout - stay with entering animation ',
  },
  ModalInNavigation: {
    screen: ModalInNavigation,
    title: '🆕 Modal In Navigation',
  },
  ModalInNavigationNativeStack: {
    screen: ModalInNavigationNativeStack,
    title: '🆕 Modal In Navigation - native stack',
  },
  WithNavigation: {
    screen: WithNavigation,
    title: '🆕 Layout Animations - with navigation ',
  },
  WithNavigationNested: {
    screen: WithNavigationNested,
    title: '🆕 Layout Animations - with navigation  Nested',
  },
};

function MainScreen({ navigation }) {
  const data = Object.keys(SCREENS).map((key) => ({ key }));
  return (
    <FlatList
      style={styles.list}
      data={data}
      ItemSeparatorComponent={ItemSeparator}
      renderItem={(props) => (
        <MainScreenItem
          {...props}
          screens={SCREENS}
          onPressItem={({ key }) => navigation.navigate(key)}
        />
      )}
      renderScrollComponent={(props) => <ScrollView {...props} />}
    />
  );
}

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <View collapsable={false} style={{ flex: 1 }}>
        <Stack.Navigator detachInactiveScreens={false}>
          <Stack.Screen
            name="Home"
            options={{ title: '🎬 Reanimated 2.x Examples' }}
            component={MainScreen}
          />
          {Object.keys(SCREENS).map((name) => (
            <Stack.Screen
              key={name}
              name={name}
              getComponent={() => SCREENS[name].screen}
              options={{ title: SCREENS[name].title || name }}
            />
          ))}
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}
