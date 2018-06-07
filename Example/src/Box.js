import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

/**
 * Needs to be a class component for react-native-gesture-handler to put a ref on it.
 */
export default class Box extends React.Component {
  render() {
    const { style, ...props } = this.props;
    return <Animated.View style={[styles.box, style]} {...props} />;
  }
}

const BOX_SIZE = 44;

const styles = StyleSheet.create({
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    alignSelf: 'center',
    backgroundColor: 'blue',
    margin: 10,
  },
});
