import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Interactable from '../../Interactable';

const Screen = Dimensions.get('window');

export default class CollapsibleFilter extends Component {
  constructor(props) {
    super(props);
    this._deltaY = new Animated.Value(0);
  }
  render() {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.filterContainer,
            {
              transform: [
                {
                  translateY: this._deltaY.interpolate({
                    inputRange: [-130, -50],
                    outputRange: [-33, 0],
                    extrapolateRight: 'clamp',
                  }),
                },
              ],
            },
          ]}>
          <Animated.View
            style={[
              styles.filterTop,
              {
                opacity: this._deltaY.interpolate({
                  inputRange: [-90, -20],
                  outputRange: [0, 1],
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              },
            ]}>
            <TouchableOpacity
              onPress={() =>
                alert('Tip: drag content up to see the filter collapse')
              }>
              <Image
                style={styles.filterUp}
                source={require('../assets/icon-up.png')}
              />
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity onPress={() => alert('Anywhere pressed')}>
            <View style={styles.filterField}>
              <Text style={styles.filterFieldText}>Anywhere</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert('Anytime pressed')}>
            <Animated.View
              style={[
                styles.filterField,
                {
                  opacity: this._deltaY.interpolate({
                    inputRange: [-70, -50],
                    outputRange: [0, 1],
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                },
              ]}>
              <Text style={styles.filterFieldText}>Anytime</Text>
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert('Anything pressed')}>
            <Animated.View
              style={[
                styles.filterField,
                {
                  opacity: this._deltaY.interpolate({
                    inputRange: [-20, 0],
                    outputRange: [0, 1],
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                },
              ]}>
              <Text style={styles.filterFieldText}>Anything</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <Interactable.View
          verticalOnly={true}
          snapPoints={[{ y: 0 }, { y: -130 }]}
          boundaries={{ top: -200 }}
          animatedValueY={this._deltaY}>
          <View style={styles.content}>
            <Text style={styles.panelTitle}>San Francisco Airport</Text>
            <Text style={styles.panelSubtitle}>
              International Airport - 40 miles away
            </Text>
            <Image
              style={styles.photo}
              source={require('../assets/airport-photo.jpg')}
            />
            <View style={styles.panelButton}>
              <Text style={styles.panelButtonTitle}>Directions</Text>
            </View>
            <View style={styles.panelButton}>
              <Text style={styles.panelButtonTitle}>Search Nearby</Text>
            </View>
          </View>
        </Interactable.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    backgroundColor: 'white',
  },
  filterContainer: {
    backgroundColor: '#278485',
    paddingTop: 10,
  },
  filterTop: {
    height: 36,
  },
  filterUp: {
    marginLeft: 24,
    width: 26,
    height: 26,
  },
  filterField: {
    height: 40,
    backgroundColor: '#3a969a',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 4,
    justifyContent: 'center',
  },
  filterFieldText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 30,
  },
  content: {
    padding: 20,
    backgroundColor: 'white',
  },
  panelTitle: {
    fontSize: 27,
    height: 35,
  },
  panelSubtitle: {
    fontSize: 14,
    color: 'gray',
    height: 30,
    marginBottom: 10,
  },
  panelButton: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#de6d77',
    alignItems: 'center',
    marginVertical: 10,
  },
  panelButtonTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  photo: {
    width: Screen.width - 40,
    height: 190,
    marginBottom: 20,
  },
});
