/**
 * This example is meant to be used for temporary purposes only. Code in this
 * file should be replaced with the actual example implementation.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createAnimatedComponent } from 'react-native-reanimated';

import { Screen } from '@/components';
import { flex } from '@/theme';

const AnimatedView = createAnimatedComponent(View);

export default function Playground() {
  return (
    <Screen style={flex.center}>
      <Text>Hello world!</Text>
      <AnimatedView
        style={{
          animationDuration: '10s',
          animationIterationCount: 'infinite',
          animationName: [
            {
              0: {
                width: 200,
              },
              0.5: {
                width: 350,
              },
              1: {
                width: 200,
              },
            },
            {
              '50%': { height: 200 },
            },
            {
              from: {
                transform: [{ rotate: '0deg' }],
              },
              to: {
                transform: [{ rotate: '360deg' }],
              },
            },
          ],
          animationTimingFunction: 'linear',
          backgroundColor: 'gray',
          height: 65,
          width: 200,
        }}>
        <View style={styles.row}>
          <View style={[flex.grow, { backgroundColor: 'blue' }]} />
          <View style={[flex.grow, { backgroundColor: 'lightblue' }]} />
          <View style={[flex.grow, { backgroundColor: 'skyblue' }]} />
          <View style={[flex.grow, { backgroundColor: 'powderblue' }]} />
        </View>

        <AnimatedView
          style={{
            animationDirection: ['normal', 'alternate'],
            animationDuration: '10s',
            animationIterationCount: 'infinite',
            animationName: [
              {
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
                from: {
                  width: 20,
                },
              },
              {
                to: {
                  backgroundColor: 'red',
                },
              },
            ],
            animationTimingFunction: 'linear',
            backgroundColor: 'gold',
            height: '100%',
            shadowColor: 'black',
            width: 20,
          }}
        />
      </AnimatedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: '50%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
