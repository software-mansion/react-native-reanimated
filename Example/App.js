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

import Menu from './Menu';
import DragTest from './testComponents/DragTest';
import SharedValueTest from './testComponents/SharedValuesTest';
import NotifyTest from './testComponents/NotifyTest';
import SpeedTest from './testComponents/SpeedTest';
import TwoHandlersTest from './testComponents/TwoHandlersTest';
import CleanupTest from './testComponents/CleanUpTest';
import SharedFunctionTest from './testComponents/SharedFunctionTest';
import WorkletsTest from './testComponents/WorkletsTest';
import SharedArraySharedObject from './testComponents/SharedArraySharedObject';
import SzymonRotationScreen from './testComponents/SzymonRotationScreen';
import SzymonRotationWithReset from './testComponents/SzymonRotationWithReset';
import SzymonStartStopScreen from './testComponents/SzymonStartStopScreen';
import WorkletFailureTest from './testComponents/WorkletFailureTest';
import MapperTest from './testComponents/MapperTest';
import MapperTest2 from './testComponents/MapperTest2';
import { ScrollView } from 'react-native-gesture-handler';
import UseAnimatedStyleTest from './testComponents/UseAnimatedStyleTest';
import WithWorklet from './testComponents/WithWorklet';
import FunctionInstallTest from './testComponents/FunctionInstallTest';
import LiquidSwipe from './LiquidSwipe/index';
import TabBar from './testComponents/TabBar.js';

// set components here:
const components = {
  LiquidSwipe: LiquidSwipe,
  TabBar: TabBar,
  '3D Menu': Menu,
  WithWorklet: WithWorklet,
  DragTest: DragTest,
  MapperTest: MapperTest,
  MapperTest2: MapperTest2,
  UseAnimatedStyle: UseAnimatedStyleTest,
  SharedValueTest: SharedValueTest,
  NotifyTest: NotifyTest,
  SpeedTest: SpeedTest,
  TwoHandlersTest: TwoHandlersTest,
  CleanupTest: CleanupTest,
  SharedFunctionTest: SharedFunctionTest,
  WorkletsTest: WorkletsTest,
  SharedArraySharedObj: SharedArraySharedObject,
  SzymonRotation: SzymonRotationScreen,
  SzymonRotationWithReset: SzymonRotationWithReset,
  SzymonStartStop: SzymonStartStopScreen,
  WorkletFailureTest: WorkletFailureTest,
  FunctionInstallTest: FunctionInstallTest,
};

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
        <ScrollView>
          {Object.keys(components).map(item => {
            return (
              <View style={{ margin: 10 }} key={item}>
                <Button
                  title={item}
                  onPress={() => {
                    this.props.navigation.navigate(item);
                  }}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }
}

const screens = {};
for (let key in components) {
  screens[key] = {
    screen: components[key],
    title: key,
  };
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
