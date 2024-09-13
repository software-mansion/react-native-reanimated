import { StyleSheet, View, SafeAreaView } from 'react-native';

import React from 'react';
import Animated from 'react-native-reanimated';

export default function ColorsExample() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Animated.View
          style={{
            width: 200,
            height: 200,
            borderRadius: 30,
            // @ts-ignore TODO
            animationName: {
              from: {
                backgroundColor: 'red',
                transform: [{ rotate: '0deg' }],
              },
              '16.7%': {
                backgroundColor: 'orange',
                transform: [{ rotate: '60deg' }],
              },
              '33.4%': {
                backgroundColor: 'yellow',
                transform: [{ rotate: '120deg' }],
              },
              '50.1%': {
                backgroundColor: 'green',
                transform: [{ rotate: '180deg' }],
              },
              '66.8%': {
                backgroundColor: 'blue',
                transform: [{ rotate: '240deg' }],
              },
              '83.5%': {
                backgroundColor: 'indigo',
                transform: [{ rotate: '300deg' }],
              },
              to: {
                backgroundColor: 'violet',
                transform: [{ rotate: '360deg' }],
              },
            },
            animationDuration: '5s',
            animationTimingFunction: 'linear',
          }}
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
});
