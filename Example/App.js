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
import SzymonRotationScreen from './SzymonRotationScreen';
import SzymonRotationWithResetScreen from './SzymonRotationWithReset'
import SzymonStartStopScreen from './SzymonStartStopScreen';


// set components here:
const components = {
  'MichalApp': MichalApp,
  'MichalAppJustSet': MichalAppJustSet,
  'MichalAppNotify': MichalAppNotify,
  'MichalAppSpeedTest': MichalAppSpeedTest,
  'MichalAppTwoHandlers': MichalAppTwoHandlers,
  'SzymonRotation': SzymonRotationScreen,
  'SzymonRotationWithReset': SzymonRotationWithResetScreen,
  'SzymonStartStop': SzymonStartStopScreen,
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
            return <Button title={ item } onPress={ () => { this.props.navigation.navigate(item) } } key={ item } />
          })
        }
      </View>
    );
  }
}

const screens = {}
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
