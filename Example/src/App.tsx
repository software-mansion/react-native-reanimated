import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { AnimatedRoot } from 'react-native-reanimated';

function Box({label}) {
  return (
    <View style={styles.box}>
      <Text>{label}</Text>
    </View>
  );
}

export default function Screen() {
  const [state, setState] =  useState(true);
  return (
    <View style={{marginTop: 30}}>
      <AnimatedRoot>
        {state && <Box key="a" label="A" />}
        <Box key="b" label="B" />
        {!state && <Box key="a" label="A" />}
      </AnimatedRoot>
      <Button onPress={() => {setState(!state)}} title="toggle" />
    </View>
  );
}

const styles = StyleSheet.create(
  {
    box: {
      margin: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: 'black',
      width: 100,
      height: 100,
    }
  }
);