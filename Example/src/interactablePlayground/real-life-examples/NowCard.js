import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Image,
  Text,
  Slider,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Interactable from '../../Interactable';

const Screen = Dimensions.get('window');

export default class NowCard extends Component {
  constructor(props) {
    super(props);
    this._deltaX = new Animated.Value(0);
    this.state = {
      damping: 1 - 0.7,
      tension: 300,
    };
  }
  render() {
    return (
      <View style={styles.container}>
        <Interactable.View
          horizontalOnly={true}
          snapPoints={[
            { x: 360 },
            {
              x: 0,
              damping: 1 - this.state.damping,
              tension: this.state.tension,
            },
            { x: -360 },
          ]}
          animatedValueX={this._deltaX}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: this._deltaX.interpolate({
                  inputRange: [-300, 0, 300],
                  outputRange: [0, 1, 0],
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              },
            ]}>
            <Text style={styles.header}>Info for you</Text>
            <Image
              style={styles.image}
              source={require('../assets/card-photo.jpg')}
            />
            <Text style={styles.title}>Card Title</Text>
            <Text style={styles.body}>
              This is the card body, it can be long
            </Text>
          </Animated.View>
        </Interactable.View>

        <View style={styles.playground}>
          <Text style={styles.playgroundLabel}>Change spring damping:</Text>
          <Slider
            key="damping"
            style={styles.slider}
            value={this.state.damping}
            minimumValue={0.1}
            maximumValue={0.6}
            minimumTrackTintColor={'#007AFF'}
            maximumTrackTintColor={'white'}
            thumbTintColor={'white'}
            onSlidingComplete={value => this.setState({ damping: value })}
          />
          <Text style={styles.playgroundLabel}>Change spring tension:</Text>
          <Slider
            key="tension"
            style={styles.slider}
            value={this.state.tension}
            minimumValue={0.0}
            maximumValue={1000.0}
            minimumTrackTintColor={'#007AFF'}
            maximumTrackTintColor={'white'}
            thumbTintColor={'white'}
            onSlidingComplete={value => this.setState({ tension: value })}
          />
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
    backgroundColor: '#efefef',
  },
  card: {
    width: Screen.width - 40,
    backgroundColor: 'white',
    borderRadius: 6,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#7f7f7f',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 2,
    shadowOpacity: 0.4,
    elevation: 4,
  },
  image: {
    width: Screen.width - 40,
    height: Screen.height <= 500 ? 70 : 150,
  },
  header: {
    marginTop: 8,
    marginLeft: 20,
    height: 22,
    fontSize: 12,
    color: '#7b7b7b',
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    marginTop: 15,
    marginBottom: 10,
    marginLeft: 15,
  },
  body: {
    marginBottom: 20,
    fontSize: 15,
    marginLeft: 15,
    color: '#7f7f7f',
  },
  playground: {
    marginTop: Screen.height <= 500 ? 10 : 40,
    padding: 20,
    width: Screen.width - 40,
    backgroundColor: '#5894f3',
    alignItems: 'stretch',
  },
  playgroundLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  slider: {
    height: 40,
  },
});
