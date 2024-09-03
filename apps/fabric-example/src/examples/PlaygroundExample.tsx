/**
 * This example is meant to be used for temporary purposes only.
 * Code in this file should be replaced with the actual example implementation.
 */

import { Text, StyleSheet, View, SafeAreaView } from 'react-native';

import React from 'react';
import Animated from 'react-native-reanimated';

export default function PlaygroundExample() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Text>Hello world!</Text>
        <Animated.View
          style={{
            height: 65,
            backgroundColor: 'gray',
            width: 200,
            animationName: {
              from: {
                width: 200,
              },
              to: {
                width: 350,
              },
            },
            animationDuration: '5s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
          }}>
          <View style={styles.row}>
            <View style={[styles.grow, { backgroundColor: 'blue' }]} />
            <View style={[styles.grow, { backgroundColor: 'lightblue' }]} />
            <View style={[styles.grow, { backgroundColor: 'skyblue' }]} />
            <View style={[styles.grow, { backgroundColor: 'powderblue' }]} />
          </View>

          <Animated.View
            style={{
              height: '100%',
              backgroundColor: 'gold',
              shadowColor: 'black',
              width: 20,
              animationName: {
                from: {
                  width: 20,
                },
                0.1: {
                  width: '75%',
                },
                0.2: {
                  width: 20,
                },
                0.3: {
                  width: '50%',
                },
                0.4: {
                  width: 20,
                },
                0.5: {
                  width: '75%',
                },
                0.6: {
                  width: 0,
                },
                0.7: {
                  width: '100%',
                },
                0.8: {
                  width: '25%',
                },
                0.9: {
                  width: '75%',
                },
                to: {
                  width: '0%',
                },
              },
              animationDuration: '10s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    height: '50%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  grow: {
    flexGrow: 1,
  },
});
