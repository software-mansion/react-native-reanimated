import React, { Component } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Interactable from '../../Interactable';

export default class SnapTo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      snapToIndex: 0,
    };
  }
  render() {
    return (
      <View style={styles.container}>
        <Interactable.View
          ref="headInstance"
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
            { x: 140, y: 250 },
          ]}
          initialPosition={{ x: 140, y: 250 }}>
          <View
            style={{
              width: 70,
              height: 70,
              backgroundColor: 'red',
              borderRadius: 35,
            }}
          />
        </Interactable.View>
        <View style={styles.button}>
          <Button
            title="Snap To Next"
            onPress={this.onButtonPress.bind(this)}
          />
        </View>
      </View>
    );
  }
  onButtonPress() {
    this.refs['headInstance'].snapTo({ index: this.state.snapToIndex });
    this.setState({
      snapToIndex: (this.state.snapToIndex + 1) % 10,
    });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  button: {
    position: 'absolute',
    left: 110,
    backgroundColor: 'yellow',
  },
});
