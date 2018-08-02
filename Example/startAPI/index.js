import React, { Component } from 'react';
import { Button, StyleSheet, View, Alert } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';

const { timing, spring, Value } = Animated;

export default class Example extends Component {
  constructor(props) {
    super(props);
    this._transX = new Value(100);
    this._config = {
      toValue: 100,
      damping: 2,
      mass: 1,
      stiffness: 121.6,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    };
    this._config2 = {
      duration: 5000,
      toValue: -120,
      easing: Easing.inOut(Easing.ease),
    };
    this._anim2 = spring(this._transX, this._config);
    this._anim = timing(this._transX, this._config2);
  }

  render() {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[styles.box, { transform: [{ translateX: this._transX }] }]}
        />
        <Button
          onPress={() => {
            this._anim.start(({ finished }) =>
              Alert.alert(finished ? 'Finished' : 'Not finished yet')
            );
          }}
          title="Start"
        />
        <Button
          onPress={() => {
            this._anim.stop();
          }}
          title="Stop"
        />
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
