import React, { Component } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Interactable from '../../Interactable';

export default class CollapsingHeader extends Component {
  constructor(props) {
    super(props);
    this._deltaY = new Animated.Value(0);
  }
  render() {
    return (
      <View style={styles.container}>
        <View
          style={{ backgroundColor: 'red', height: 250, alignItems: 'center' }}>
          <Animated.View
            style={{
              transform: [
                {
                  translateY: this._deltaY.interpolate({
                    inputRange: [-150, -150, 0, 0],
                    outputRange: [-58, -58, 0, 0],
                  }),
                },
                {
                  scale: this._deltaY.interpolate({
                    inputRange: [-150, -150, 0, 0],
                    outputRange: [0.35, 0.35, 1, 1],
                  }),
                },
              ],
            }}>
            <View
              style={{
                width: 150,
                height: 150,
                backgroundColor: 'blue',
                borderRadius: 75,
                marginTop: 50,
              }}
            />
          </Animated.View>
        </View>

        <Interactable.View
          verticalOnly={true}
          snapPoints={[{ y: 0 }, { y: -150 }]}
          boundaries={{ top: -150 }}
          animatedValueY={this._deltaY}>
          <View
            style={{
              left: 0,
              right: 0,
              height: 650,
              backgroundColor: '#e0e0e0',
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
    backgroundColor: 'white',
  },
});
