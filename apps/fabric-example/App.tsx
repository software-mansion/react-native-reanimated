import { Text, StyleSheet, View, Button, SafeAreaView } from 'react-native';

import React from 'react';
import Animated from 'react-native-reanimated';

export default function EmptyExample() {
  const [someState, setSomeState] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Button
        title={`${someState ? 'Disable' : 'Enable'} additional animation`}
        onPress={() => setSomeState(!someState)}
      />
      <View style={styles.container}>
        <Text>Hello world!</Text>
        <Animated.View
          style={{
            width: 100,
            height: 100,
            backgroundColor: 'blue',
            shadowColor: 'black',
            // @ts-ignore TODO
            animationName: {
              from: {
                width: 50,
                height: 50,
                transform: [{ scale: 0 }, { translateX: 0 }],
              },
              0.2: {
                width: 300,
                opacity: 1,
              },
              '50%': {
                height: 600,
                opacity: 0.25,
                transform: [{ scale: 1 }, { translateX: 100 }],
              },
              0.75: {
                width: 300,
                opacity: 1,
                transform: [{ translateX: -200 }],
              },
              to: {
                width: 200,
                height: 200,
                transform: [{ translateX: 0 }],
              },
            },
            animationDuration: '2s',
            animationTimingFunction: 'linear',
          }}
        />

        {someState ? (
          <Animated.View
            style={{
              height: 50,
              backgroundColor: 'cyan',
              shadowColor: 'black',
              shadowRadius: 10,
              // @ts-ignore TODO
              animationName: {
                from: {
                  width: 100,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.25,
                },
                '50%': {
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                },
                to: {
                  width: 300,
                  shadowOffset: { width: 0, height: -10 },
                  shadowOpacity: 0.25,
                },
              },
              animationDuration: '1000ms',
              animationTimingFunction: 'ease-in-out-back',
            }}
          />
        ) : (
          <></>
        )}
        <Animated.View
          style={{
            height: 50,
            backgroundColor: 'magenta',
            // @ts-ignore TODO
            animationName: {
              from: {
                width: 200,
                transform: [{ rotate: '0deg' }],
                zIndex: 0,
              },
              0.5: {
                transform: [{ rotate: 2 * Math.PI + 'rad' }],
                width: 500,
                zIndex: -1,
              },
              to: {
                width: 300,
                transform: [{ rotate: '-360deg' }],
              },
            },
            animationDuration: '2000ms',
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
