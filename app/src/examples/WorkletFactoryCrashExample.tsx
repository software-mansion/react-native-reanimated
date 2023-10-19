/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Button, StyleSheet, View } from 'react-native';

export default function App() {
  function handleOnPress() {
    function badWorklet() {
      'worklet';
      // @ts-expect-error
      unexistingVariable;
    }
  }

  return (
    <View style={styles.container}>
      <Button title={'Crash me'} onPress={handleOnPress} />
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
