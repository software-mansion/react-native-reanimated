import React, { Component } from 'react';
import { Button, StyleSheet, View } from 'react-native';

import Animated from 'react-native-reanimated';

const { Value } = Animated;

export default class Example extends Component {
  state = {
    visible: true,
  };
  _transX = new Value(0);
  _toggleVisibility = () => this.setState(prev => ({ visible: !prev.visible }));
  render() {
    return (
      <View style={styles.container}>
        {this.state.visible && (
          <Animated.View
            style={[styles.box, { transform: [{ translateX: this._transX }] }]}
          />
        )}
        <Button
          title="Set X to 100"
          onPress={() => this._transX.setValue(100)}
        />
        <Button
          title="Set X to -100"
          onPress={() => this._transX.setValue(-100)}
        />
        <Button title="Show/hide button" onPress={this._toggleVisibility} />
      </View>
    );
  }
}

const BOX_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderColor: '#F5FCFF',
    alignSelf: 'center',
    backgroundColor: 'plum',
    margin: BOX_SIZE / 2,
  },
});
