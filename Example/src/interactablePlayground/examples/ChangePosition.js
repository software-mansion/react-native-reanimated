import React, { Component } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import Interactable from '../../Interactable';

export default class ChangePosition extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    const snapPoints = [
      { x: -140, y: -250 },
      { x: 140, y: -250 },
      { x: -140, y: -120 },
      { x: 140, y: -120 },
      { x: -140, y: 0 },
      { x: 140, y: 0 },
      { x: -140, y: 120 },
      { x: 140, y: 120 },
      { x: -140, y: 250 },
      { x: 140, y: 250 },
    ];
    const blueDestination = snapPoints[3];
    return (
      <View style={styles.container}>
        <Interactable.View
          style={{ zIndex: 2 }}
          ref="blue"
          snapPoints={snapPoints}
          initialPosition={{ x: -140, y: 0 }}>
          <View
            style={{
              width: 70,
              height: 70,
              backgroundColor: 'blue',
              borderRadius: 35,
            }}
          />
        </Interactable.View>
        <Interactable.View
          style={{ zIndex: 2 }}
          ref="green"
          snapPoints={snapPoints}
          initialPosition={{ x: -140, y: 0 }}>
          <View
            style={{
              width: 70,
              height: 70,
              backgroundColor: 'green',
              borderRadius: 35,
            }}
          />
        </Interactable.View>
        <View
          style={{
            position: 'absolute',
            left: 140,
            zIndex: 1,
          }}>
          <TouchableOpacity
            onPress={() => {
              this.refs['blue'].changePosition(blueDestination);
            }}>
            <Text style={{ color: 'blue', fontSize: 12 }}>
              {'ChangePosition to ' + JSON.stringify(blueDestination)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              this.refs['green'].changePosition({
                x: (Math.random() - 0.5) * 280,
                y: (Math.random() - 0.5) * 500,
              });
            }}>
            <Text style={{ color: 'green' }}>ChangePosition to random</Text>
          </TouchableOpacity>
        </View>
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
