import React from 'react';
import { Text, View, FlatList, StyleSheet, YellowBox } from 'react-native';
import { createStackNavigator } from 'react-navigation';
import { RectButton, ScrollView } from 'react-native-gesture-handler';

import Snappable from './snappable';
import ImageViewer from './imageViewer';
import Test from './test';
import Interpolate from './src/interpolate';
import Colors from './colors';
import StartAPI from './startAPI';
import ChatHeads from './chatHeads';
import Code from './code';
import WidthAndHeight from './widthAndHeight';
import Rotations from './rotations';
import Imperative from './imperative';
import PanRotateAndZoom from './PanRotateAndZoom';

import InteractablePlayground, {
  SCREENS as INTERACTABLE_SCREENS,
} from './interactablePlayground';

YellowBox.ignoreWarnings([
  'Warning: isMounted(...) is deprecated',
  'Module RCTImageLoader',
]);
// refers to bug in React Navigation which should be fixed soon
// https://github.com/react-navigation/react-navigation/issues/3956

const SCREENS = {
  Snappable: { screen: Snappable, title: 'Snappable' },
  Test: { screen: Test, title: 'Test' },
  ImageViewer: { screen: ImageViewer, title: 'Image Viewer' },
  Interactable: { screen: InteractablePlayground, title: 'Interactable' },
  Interpolate: { screen: Interpolate, title: 'Interpolate' },
  Colors: { screen: Colors, title: 'Colors' },
  StartAPI: { screen: StartAPI, title: 'Start API' },
  chatHeads: { screen: ChatHeads, title: 'Chat heads (iOS only)' },
  code: { screen: Code, title: 'Animated.Code component' },
  width: { screen: WidthAndHeight, title: 'width & height & more' },
  rotations: { screen: Rotations, title: 'rotations (concat node)' },
  imperative: {
    screen: Imperative,
    title: 'imperative (set value / toggle visibility)',
  },
  panRotateAndZoom: {
    screen: PanRotateAndZoom,
    title: 'Pan, rotate and zoom (via native event function)',
  },
};

class MainScreen extends React.Component {
  static navigationOptions = {
    title: '🎬 Reanimated Examples',
  };
  render() {
    const data = Object.keys(SCREENS).map(key => ({ key }));
    return (
      <FlatList
        style={styles.list}
        data={data}
        ItemSeparatorComponent={ItemSeparator}
        renderItem={props => (
          <MainScreenItem
            {...props}
            onPressItem={({ key }) => this.props.navigation.navigate(key)}
          />
        )}
        renderScrollComponent={props => <ScrollView {...props} />}
      />
    );
  }
}

const ItemSeparator = () => <View style={styles.separator} />;

class MainScreenItem extends React.Component {
  _onPress = () => this.props.onPressItem(this.props.item);
  render() {
    const { key } = this.props.item;
    return (
      <RectButton style={styles.button} onPress={this._onPress}>
        <Text style={styles.buttonText}>{SCREENS[key].title || key}</Text>
      </RectButton>
    );
  }
}

const ExampleApp = createStackNavigator(
  {
    Main: { screen: MainScreen },
    ...SCREENS,
    ...INTERACTABLE_SCREENS,
  },
  {
    initialRouteName: 'Main',
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

export default ExampleApp;
