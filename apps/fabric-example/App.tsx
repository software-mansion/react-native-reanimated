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
              // @ts-ignore TODO
              animationName: {
                from: {
                  width: 0,
                },
                to: {
                  width: 300,
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
                width: 0,
              },
              to: {
                width: 300,
              },
            },
            animationDuration: '3500ms',
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
