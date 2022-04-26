import React, { useState } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function App() {
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  return (
    <View style={{ margin: 40 }}>
      <Button title="show/hide" onPress={() => setShow(!show)} />
      {show && (
        <View style={{ borderWidth: 1, padding: 5, borderColor: 'red' }}>
          <Animated.View
            style={{ width: 30, height: 30, backgroundColor: 'red' }}
            exiting={FadeOut.duration(1500)}
            entering={FadeIn.duration(1500)}
          />
        </View>
      )}
      <Button title="show/hide" onPress={() => setShow2(!show2)} />
      {show2 && (
        <View style={{ borderWidth: 1, borderColor: 'red' }}>
          <View style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
