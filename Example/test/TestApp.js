import { createBrowserApp } from '@react-navigation/web';
import React from 'react';
import {
  FlatList,
  Platform,
  YellowBox,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { createAppContainer, createSwitchNavigator } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

import { styles, ItemSeparator, MainScreenItem } from '../src/App'

import SimpleTest from './SimpleTest'

YellowBox.ignoreWarnings(['Calling `getNode()`']);

const SCREENS = {
    SimpleTest: {
        screen: SimpleTest,
        title: '🆕 Simple test',
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
          screens={ SCREENS }
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
