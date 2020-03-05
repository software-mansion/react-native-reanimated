import React from 'react';
import {
  Text,
  View,
  YellowBox,
  NativeModules,
  Platform,
  Button,
} from 'react-native';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

import MichalApp from './MichalApp'
import MichalAppJustSet from './MichalAppJustSet'
import MichalAppNotify from './MichalAppNotify'
import MichalAppSpeedTest from './MichalAppSpeedTest'
import MichalAppTwoHandlers from './MichalAppTwoHandlers'

const components = {
  'MichalApp': MichalApp,
  'MichalAppJustSet': MichalAppJustSet,
  'MichalAppNotify': MichalAppNotify,
  'MichalAppSpeedTest': MichalAppSpeedTest,
  'MichalAppTwoHandlers': MichalAppTwoHandlers,
}

YellowBox.ignoreWarnings([
  'Warning: isMounted(...) is deprecated',
  'Module RCTImageLoader',
]);
// refers to bug in React Navigation which should be fixed soon
// https://github.com/react-navigation/react-navigation/issues/3956

class MainScreen extends React.Component {
  static navigationOptions = {
    title: '🎬 Reanimated Examples',
  };

  render() {
    return (
      <View>
        <Text>Pick the screen:</Text>
        {
          Object.keys(components).map(item => {
            return <Button title={ item } onPress={ () => { this.props.navigation.navigate(item) } } />
          })
        }
      </View>
    );
  }
}

const screens = {}
console.log('here')
for (let key in components) {
  screens[key] = {
    screen: components[key],
    title: key,
  }
}

const ExampleApp = createStackNavigator(
  {
    MainScreen: { screen: MainScreen },
    ...screens,
    /*MichalApp: { screen: MichalApp, title: 'MichalApp' },
    MichalAppJustSet: { screen: MichalAppJustSet, title: 'MichalAppJustSet' },
    MichalAppNotify: { screen: MichalAppNotify, title: 'MichalAppNotify' },
    MichalAppSpeedTest: { screen: MichalAppSpeedTest, title: 'MichalAppSpeedTest' },
    MichalAppTwoHandlers: { screen: MichalAppTwoHandlers, title: 'MichalAppTwoHandlers' },*/
  },
  {
    initialRouteName: 'MainScreen',
    headerMode: 'screen',
  }
);

const createApp = Platform.select({
  web: input => createBrowserApp(input, { history: 'hash' }),
  default: input => createAppContainer(input),
});


export default createApp(ExampleApp);
