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

import Animated, { SharedValue, Worklet } from 'react-native-reanimated';


import AnimatedSharedValue from '../src/core/AnimatedSharedValue';
const { ReanimatedModule } = NativeModules;

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

  constructor(props) {
    super(props);
    this.str = ''
    this.value = new SharedValue(this.str);
    this.finalValue = new SharedValue('aaa');
    this.appendValue = new SharedValue('a');

    this.worklet = new Worklet((v, f, a) => {
      'worklet'
      this.log(v.get())
      if (v.get() !== f.get()) {
        v.set(v.get() + a.get())
        return false
      }
      return true
    })

  }

  componentDidMount() {
    this.worklet.apply([this.value, this.finalValue, this.appendValue]);
  }

  componentWillUnmount() {
    this.worklet.release();
  }

  render() {
    return (
      <View>
        <Text>OK</Text>
      </View>
    );
  }

}


export default MainScreen;
