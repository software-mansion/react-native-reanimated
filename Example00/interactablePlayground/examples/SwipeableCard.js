import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import Interactable from '../../Interactable';

export default class SwipeableCard extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Interactable.View
          key="first"
          horizontalOnly={true}
          snapPoints={[{ x: 360 }, { x: 0, damping: 0.5 }, { x: -360 }]}>
          <View style={styles.card} />
        </Interactable.View>

        <Interactable.View
          key="second"
          horizontalOnly={true}
          snapPoints={[{ x: 360 }, { x: 0 }, { x: -360 }]}>
          <View style={styles.card} />
        </Interactable.View>

        <Interactable.View
          key="third"
          horizontalOnly={true}
          snapPoints={[{ x: 360 }, { x: 0, damping: 0.8 }, { x: -360 }]}>
          <View style={styles.card} />
        </Interactable.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  card: {
    width: 300,
    height: 180,
    backgroundColor: 'red',
    borderRadius: 8,
    marginVertical: 6,
  },
});
