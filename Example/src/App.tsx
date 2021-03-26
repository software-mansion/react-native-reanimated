import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { AnimatedRoot, withTiming, withSpring } from 'react-native-reanimated';

function Box({label, state}) {
  let sz = 100;
  if (state) {
    sz = 50;
  } 
  return (
    <View style={[styles.box,{width: sz, height: sz}]}>
      <Text>{label}</Text>
    </View>
  );
}

export default function Screen() {
  const [state, setState] =  useState(true);
  return (
    <View style={{marginTop: 30}}>
      <AnimatedRoot animation={withTiming(1, {duration: 500})} isShallow={false}>
        {state && <Box key="a" label="A" state={state} />}
        <Box key="b" label="B" />
        {!state && <Box key="a" label="A" state={state}/>}
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