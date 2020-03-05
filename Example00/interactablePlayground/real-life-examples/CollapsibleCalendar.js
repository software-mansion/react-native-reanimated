import React, { Component } from 'react';
import { StyleSheet, View, Dimensions, Image, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import Interactable from '../../Interactable';

const Screen = Dimensions.get('window');
const Calendar = {
  width: Screen.width - 16,
  height: (Screen.width - 16) / 944 * 793,
};

export default class CollapsibleFilter extends Component {
  constructor(props) {
    super(props);
    this._deltaY = new Animated.Value(0);
  }
  render() {
    return (
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={styles.header}>
            <Animated.Text
              style={[
                styles.month,
                {
                  opacity: this._deltaY.interpolate({
                    inputRange: [-Calendar.height * 0.84, 0],
                    outputRange: [0, 1],
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                  transform: [
                    {
                      translateY: this._deltaY.interpolate({
                        inputRange: [-Calendar.height * 0.84, 0],
                        outputRange: [-40, 0],
                      }),
                    },
                  ],
                },
              ]}>
              FEBRUARY 2017
            </Animated.Text>
            <Animated.Text
              style={[
                styles.month,
                {
                  opacity: this._deltaY.interpolate({
                    inputRange: [-Calendar.height * 0.84, 0],
                    outputRange: [1, 0],
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                  transform: [
                    {
                      translateY: this._deltaY.interpolate({
                        inputRange: [-Calendar.height * 0.84, 0],
                        outputRange: [0, 40],
                      }),
                    },
                  ],
                },
              ]}>
              THIS WEEK
            </Animated.Text>
          </View>
          <Image
            style={styles.days}
            source={require('../assets/calendar-header.png')}
          />
        </View>

        <Animated.Image
          style={[
            styles.calendar,
            {
              transform: [
                {
                  translateY: this._deltaY.interpolate({
                    inputRange: [-Calendar.height * 0.84, 0],
                    outputRange: [-Calendar.height * 0.5, 0],
                  }),
                },
              ],
            },
          ]}
          source={require('../assets/calendar-body.png')}
        />

        <Interactable.View
          verticalOnly={true}
          snapPoints={[{ y: 0 }, { y: -Calendar.height * 0.84 }]}
          boundaries={{ top: -Calendar.height }}
          animatedValueY={this._deltaY}>
          <View style={styles.content}>
            <Row hour="09:00" text="Reminder Only: UX" />
            <Row hour="10:20" text="Mobile Guild Core - Daily" />
            <Row hour="18:00" text="Mobile Happy Thursday!" />
          </View>
        </Interactable.View>
      </View>
    );
  }
}

class Row extends Component {
  render() {
    return (
      <View style={styles.row}>
        <Text style={styles.hour}>{this.props.hour}</Text>
        <Text style={styles.text}>{this.props.text}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  top: {
    backgroundColor: 'white',
    width: Screen.width,
    alignItems: 'center',
    zIndex: 1000,
  },
  header: {
    marginTop: 15,
    height: 40,
    width: Screen.width,
    paddingLeft: 20,
  },
  month: {
    position: 'absolute',
    left: 20,
    color: '#e33534',
    fontSize: 24,
    fontWeight: 'bold',
  },
  days: {
    width: Screen.width - 16,
    height: (Screen.width - 16) / 944 * 65,
  },
  calendar: {
    width: Calendar.width,
    height: Calendar.height,
  },
  content: {
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    width: Screen.width,
    borderBottomWidth: 1,
    borderColor: '#eeeeee',
    height: 80,
    alignItems: 'center',
  },
  hour: {
    width: 80,
    textAlign: 'center',
    color: '#b0b0b0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  text: {
    flex: 1,
    fontSize: 24,
  },
});
