import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  TouchableOpacity,
  Dimensions,
  Slider,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Interactable from '../../Interactable';

const Screen = Dimensions.get('window');

export default class RowActions2 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      damping: 1 - 0.7,
      tension: 300,
    };
  }
  render() {
    return (
      <View style={styles.container}>
        <Row damping={this.state.damping} tension={this.state.tension}>
          <View style={styles.rowContent}>
            <View style={styles.rowIcon} />
            <View>
              <Text style={styles.rowTitle}>Row Title</Text>
              <Text style={styles.rowSubtitle}>
                Drag the row left and right
              </Text>
            </View>
          </View>
        </Row>
        <Row damping={this.state.damping} tension={this.state.tension}>
          <View style={styles.rowContent}>
            <View style={styles.rowIcon} />
            <View>
              <Text style={styles.rowTitle}>Another Row</Text>
              <Text style={styles.rowSubtitle}>You can drag this row too</Text>
            </View>
          </View>
        </Row>
        <Row damping={this.state.damping} tension={this.state.tension}>
          <View style={styles.rowContent}>
            <View style={styles.rowIcon} />
            <View>
              <Text style={styles.rowTitle}>And A Third</Text>
              <Text style={styles.rowSubtitle}>
                This row can also be swiped
              </Text>
            </View>
          </View>
        </Row>

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

class Row extends Component {
  constructor(props) {
    super(props);
    this._deltaX = new Animated.Value(0);
  }
  render() {
    return (
      <View style={{ backgroundColor: '#ceced2' }}>
        <View
          style={{ position: 'absolute', left: 0, right: 0, height: 75 }}
          pointerEvents="box-none">
          <Animated.View
            style={[
              styles.trashHolder,
              {
                transform: [
                  {
                    translateX: this._deltaX.interpolate({
                      inputRange: [-155, 0],
                      outputRange: [0, 155],
                    }),
                  },
                ],
              },
            ]}>
            <TouchableOpacity
              onPress={this.onButtonPress.bind(this, 'trash')}
              style={styles.button}>
              <Image
                style={styles.button}
                source={require('../assets/icon-trash.png')}
              />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.snoozeHolder,
              {
                transform: [
                  {
                    translateX: this._deltaX.interpolate({
                      inputRange: [-155, 0],
                      outputRange: [0, 78],
                    }),
                  },
                ],
              },
            ]}>
            <TouchableOpacity
              onPress={this.onButtonPress.bind(this, 'snooze')}
              style={styles.button}>
              <Image
                style={styles.button}
                source={require('../assets/icon-clock.png')}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View
          style={{ position: 'absolute', left: 0, right: 0, height: 75 }}
          pointerEvents="box-none">
          <Animated.View
            style={[
              styles.doneHolder,
              {
                transform: [
                  {
                    translateX: this._deltaX.interpolate({
                      inputRange: [0, 78],
                      outputRange: [-78, 0],
                    }),
                  },
                ],
              },
            ]}>
            <TouchableOpacity
              onPress={this.onButtonPress.bind(this, 'done')}
              style={styles.button}>
              <Image
                style={styles.button}
                source={require('../assets/icon-check.png')}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Interactable.View
          horizontalOnly={true}
          snapPoints={[
            {
              x: 78,
              damping: 1 - this.props.damping,
              tension: this.props.tension,
            },
            {
              x: 0,
              damping: 1 - this.props.damping,
              tension: this.props.tension,
            },
            {
              x: -155,
              damping: 1 - this.props.damping,
              tension: this.props.tension,
            },
          ]}
          animatedValueX={this._deltaX}>
          <View
            style={{ left: 0, right: 0, height: 75, backgroundColor: 'white' }}>
            {this.props.children}
          </View>
        </Interactable.View>
      </View>
    );
  }
  onButtonPress(name) {
    alert(`Button ${name} pressed`);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#eeeeee',
  },
  rowIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#73d4e3',
    margin: 20,
  },
  rowTitle: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  rowSubtitle: {
    fontSize: 18,
    color: 'gray',
  },
  button: {
    width: 40,
    height: 40,
  },
  trashHolder: {
    position: 'absolute',
    top: 0,
    left: Screen.width - 155,
    width: Screen.width,
    height: 75,
    paddingLeft: 18,
    backgroundColor: '#f8a024',
    justifyContent: 'center',
  },
  snoozeHolder: {
    position: 'absolute',
    top: 0,
    left: Screen.width - 78,
    width: Screen.width,
    height: 75,
    paddingLeft: 18,
    backgroundColor: '#4f7db0',
    justifyContent: 'center',
  },
  doneHolder: {
    position: 'absolute',
    top: 0,
    right: Screen.width - 78,
    width: Screen.width,
    height: 75,
    paddingRight: 18,
    backgroundColor: '#2f9a5d',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  playground: {
    marginTop: Screen.height <= 500 ? 0 : 80,
    padding: 20,
    width: Screen.width - 40,
    backgroundColor: '#5894f3',
    alignItems: 'stretch',
    alignSelf: 'center',
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
