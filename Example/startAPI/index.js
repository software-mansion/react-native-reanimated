import React, { Component } from 'react';
import { Button, StyleSheet, View, Alert } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';

const { timing, spring, color, multiply, round, Value } = Animated;

export default class Example extends Component {
  constructor(props) {
    super(props);
    this._transX = new Value(0);
    this._config = {
      toValue: 1,
      damping: 2,
      mass: 1,
      stiffness: 121.6,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    };
    this._config2 = {
      duration: 5000,
      toValue: 1,
      easing: Easing.inOut(Easing.ease),
    };
    this._anim2 = spring(this._transX, this._config);
    this._anim = timing(this._transX, this._config2);
  }

  render() {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.box,
            {
              backgroundColor: color(round(multiply(this._transX, 255)), 0, 0),
            },
          ]}
        />
        <Button
          onPress={() => {
            this._anim.start(({ finished }) =>
              Alert.alert(finished ? 'Finished' : 'Not completed')
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
        <Button
          onPress={() => {
            this._anim2.start(({ finished }) =>
              Alert.alert(finished ? '2 Finished' : '2 Not completed')
            );
          }}
          title="Start another"
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
    margin: BOX_SIZE / 2,
  },
});
