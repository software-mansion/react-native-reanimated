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

import DragTest from './testComponents/DragTest'
import SharedValueTest from './testComponents/SharedValuesTest'
import NotifyTest from './testComponents/NotifyTest'
import SpeedTest from './testComponents/SpeedTest'
import TwoHandlersTest from './testComponents/TwoHandlersTest'
import CleanupTest from './testComponents/CleanUpTest'


// set components here:
const components = {
  'DragTest': DragTest,
  'SharedValueTest': SharedValueTest,
  'NotifyTest': NotifyTest,
  'SpeedTest': SpeedTest,
  'TwoHandlersTest': TwoHandlersTest,
  'CleanupTest': CleanupTest,
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
            return (
              <View style={ { margin: 10 } } key={ item }>
                <Button title={ item } onPress={ () => { this.props.navigation.navigate(item) } } />
              </View>
              )
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
