import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import Interactable from '../../Interactable';

export default class ChatHeads extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Interactable.View
          snapPoints={[
            { x: -140, y: -250 },
            { x: 140, y: -250 },
            { x: -140, y: -120 },
            { x: 140, y: -120 },
            { x: -140, y: 0 },
            { x: 140, y: 0 },
            { x: -140, y: 120 },
            { x: 140, y: 120 },
            { x: -140, y: 250 },
            { x: 140, y: 250, tension: 50, damping: 0.9 },
          ]}
          initialPosition={{ x: -140, y: -250 }}>
          <View
            style={{
              width: 70,
              height: 70,
              backgroundColor: 'red',
              borderRadius: 35,
            }}
          />
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
});
