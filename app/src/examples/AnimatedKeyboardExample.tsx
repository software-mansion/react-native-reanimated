import { StyleSheet, TextInput, Text, View, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';

export default function AnimatedKeyboardExample() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const initialViewportHeight = visualViewport.height;

    if (visualViewport) {
      visualViewport.onresize = () => {
        setKeyboardHeight(initialViewportHeight - visualViewport.height);
        console.log(initialViewportHeight - visualViewport.height);
      };
    }
  }, []);

  const onInputPress = () => {};

  return (
    <ScrollView style={styles.flexOne}>
      <View style={styles.container}>
        <Text>Keyboard height is: {keyboardHeight}</Text>
        <TextInput style={styles.textInput} onFocus={onInputPress} />
        <View style={styles.measuringBox} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 70,
  },
  textInput: {
    flex: 1,
    borderColor: 'blue',
    borderStyle: 'solid',
    borderWidth: 2,
    height: 60,
    width: 200,
    marginVertical: 30,
  },
  measuringBox: {
    width: 300,
    height: 300,
    borderColor: 'purple',
    borderWidth: 2,
  },
});
