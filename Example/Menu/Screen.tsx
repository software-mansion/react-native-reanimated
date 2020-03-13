import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native-gesture-handler';
import { perspective } from './Constants';

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F6F5F9',
  },
  button: {
    borderColor: 'black',
    borderWidth: 2,
    borderRadius: 20,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ({ open, close, rotateY, scale, opacity, borderRadius }) => {
  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            borderRadius,
            transform: [
              perspective,
              { translateX: width / 2 },
              { rotateY },
              { translateX: -width / 2 },
              { scale },
            ],
          },
        ]}>
        <TouchableOpacity onPress={open}>
          <View style={styles.button}>
            <Text style={styles.label}>Show Menu</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'black',
          opacity,
        }}
      />
    </>
  );
};
