import React, { Component } from 'react';
import { StyleSheet, View, ScrollView, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import Interactable from '../../Interactable';

const Screen = {
  height: Dimensions.get('window').height - 75,
};

export default class CollapsingHeaderWithScroll extends Component {
  constructor(props) {
    super(props);
    this._deltaY = new Animated.Value(0);
    this.state = {
      canScroll: false,
    };
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
          snapPoints={[{ y: 0 }, { y: -150, id: 'bottom' }]}
          boundaries={{ top: -150 }}
          onSnap={this.onSnap.bind(this)}
          animatedValueY={this._deltaY}>
          <ScrollView
            bounces={false}
            canCancelContentTouches={this.state.canScroll}
            onScroll={this.onScroll.bind(this)}
            style={{
              left: 0,
              right: 0,
              height: Screen.height - 100,
              backgroundColor: '#e0e0e0',
            }}>
            <View style={styles.placeholder} />
            <View style={styles.placeholder} />
            <View style={styles.placeholder} />
            <View style={styles.placeholder} />
            <View style={styles.placeholder} />
            <View style={styles.placeholder} />
            <View style={styles.placeholder} />
          </ScrollView>
        </Interactable.View>
      </View>
    );
  }
  onSnap(event) {
    const { id } = event.nativeEvent;
    if (id === 'bottom') {
      this.setState({ canScroll: true });
      alert('This implementation is still broken, in progress');
    }
  }
  onScroll(event) {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y === 0) {
      this.setState({ canScroll: false });
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  placeholder: {
    backgroundColor: 'yellow',
    flex: 1,
    height: 120,
    marginHorizontal: 20,
    marginTop: 20,
  },
});
