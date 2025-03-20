import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { runOnUI } from 'react-native-reanimated';

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button
        title="Press me"
        onPress={() => {
          runOnUI(() => {
            globalThis.fetch('https://tomekzaw.pl');
            const print = () => {
              if (globalThis.response !== undefined) {
                console.log(globalThis.response);
              } else {
                requestAnimationFrame(print);
              }
            };
            print();
          })();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
