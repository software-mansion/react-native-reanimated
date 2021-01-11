import { createBrowserApp } from '@react-navigation/web';
import React from 'react';
import { FlatList, Platform, LogBox } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { createAppContainer, createSwitchNavigator } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

import { styles, ItemSeparator, MainScreenItem } from '../src/App';

import SimpleTest from './SimpleTest';
import MeasureTest from './MeasureTest';
import FastRefreshTest from './FastRefreshTest';
import ScrollToTest from './scrollToTest';
import AnimatedReactionTest from './AnimatedReactionTest';
import AnimationsTest from './Animations';
import UpdatePropsTest from './UpdatePropsTest';

LogBox.ignoreLogs(['Calling `getNode()`']);

const SCREENS = {
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

MainScreen.navigationOptions = {
  title: '🎬 Reanimated 2.x Tests',
};

const Reanimated2App = createStackNavigator(
  {
    Main: { screen: MainScreen },
    ...SCREENS,
  },
  {
    initialRouteName: 'Main',
    headerMode: 'screen',
  }
);

const TestApp = createSwitchNavigator({
  Reanimated2App,
});

const createApp = Platform.select({
  web: (input) => createBrowserApp(input, { history: 'hash' }),
  default: (input) => createAppContainer(input),
});

export default createApp(TestApp);
