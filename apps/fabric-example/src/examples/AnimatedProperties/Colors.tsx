import { StyleSheet, View, SafeAreaView } from 'react-native';

import React from 'react';
import Animated from 'react-native-reanimated';
import { radius, sizes } from '../../theme';

export default function ColorsExample() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.box,
            {
              animationName: {
                '0%': {
                  backgroundColor: 'red',
                },
                '14.3%': {
                  backgroundColor: 'orange',
                },
                '28.6%': {
                  backgroundColor: 'yellow',
                },
                '42.9%': {
                  backgroundColor: 'green',
                },
                '57.1%': {
                  backgroundColor: 'blue',
                },
                '71.4%': {
                  backgroundColor: 'indigo',
                },
                '85.7%': {
                  backgroundColor: 'violet',
                },
                '100%': {
                  backgroundColor: 'red',
                  transform: [{ rotate: '360deg' }],
                },
              },
              animationDuration: '5s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            },
          ]}
        />
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
  box: {
    width: sizes.xxxl,
    height: sizes.xxxl,
    borderRadius: radius.xxl,
  },
});
