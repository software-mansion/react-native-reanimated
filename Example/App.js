import { createBrowserApp } from '@react-navigation/web';
import React from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
  YellowBox,
  TouchableHighlight,
  NativeModules,
  TurboModuleRegistry,
} from 'react-native';
const { ReanimatedModule } = NativeModules;
import { RectButton, ScrollView } from 'react-native-gesture-handler';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

import ChatHeads from './chatHeads';
import Code from './code';
import Colors from './colors';
import DifferentSpringConfigs from './differentSpringConfigs';
import ImageViewer from './imageViewer';
import Imperative from './imperative';
import InteractablePlayground, {
  SCREENS as INTERACTABLE_SCREENS,
} from './interactablePlayground';
import PanRotateAndZoom from './PanRotateAndZoom';
import ProgressBar from './progressBar';
import Rotations from './rotations';
import Snappable from './snappable';
import Interpolate from './src/interpolate';
import StartAPI from './startAPI';
import Test from './test';
import TransitionsProgress from './transitions/progress';
import TransitionsSequence from './transitions/sequence';
import TransitionsShuffle from './transitions/shuffle';
import TransitionsTicket from './transitions/ticket';
import WidthAndHeight from './widthAndHeight';

YellowBox.ignoreWarnings([
  'Warning: isMounted(...) is deprecated',
  'Module RCTImageLoader',
]);
// refers to bug in React Navigation which should be fixed soon
// https://github.com/react-navigation/react-navigation/issues/3956


//const nativeModule = TurboModuleRegistry.get("SampleTurboModule"); 
const re = TurboModuleRegistry.get("NativeReanimated");

function callback(text) {
  console.warn("text: " + text);
}

function callback2(text) {
  return 5;
}

class MainScreen extends React.Component {
  static navigationOptions = {
    title: '🎬 Reanimated Examples',
  };

  componentDidMount() {
    //console.warn("native: " + global.NativeReanimated.getString("ok"));
    //global.NativeReanimated.call(callback);
    //global.callback2 = callback2;
    //console.log("okokokokok:",nativeModule.getString("test"));
    re.call(callback);
  }

  render() {

    return (
      <View>
        <Text>dziala</Text>
        <TouchableHighlight onPress={ async () => {console.warn(global.NativeReanimated.getString(callback2.toString())); }}>
          <Text> remember callback </Text>
        </TouchableHighlight>
        <TouchableHighlight onPress={ async () => {ReanimatedModule.custom()}} >
          <Text> call from second js context </Text>
        </TouchableHighlight>
        <Text>{callback2.toString()}</Text>
      </View>
    );
  }
}

const ExampleApp = createStackNavigator(
  {
    Main: { screen: MainScreen },
  },
  {
    initialRouteName: 'Main',
    headerMode: 'screen',
  }
);

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

const createApp = Platform.select({
  web: input => createBrowserApp(input, { history: 'hash' }),
  default: input => createAppContainer(input),
});

export default createApp(ExampleApp);
