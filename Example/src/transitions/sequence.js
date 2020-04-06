import React, { useState, useRef } from 'react';
import { Text, View, StyleSheet, Button, StatusBar } from 'react-native';
import { Transitioning, Transition } from 'react-native-reanimated';

function Sequence() {
  const transition = (
    <Transition.Sequence>
      <Transition.Out type="scale" />
      <Transition.Change interpolation="easeInOut" />
      <Transition.In type="fade" />
    </Transition.Sequence>
  );

  let [showText, setShowText] = useState(true);
  const ref = useRef();

  return (
    <Transitioning.View
      ref={ref}
      transition={transition}
      style={styles.centerAll}>
      <Button
        title="show or hide"
        color="#FF5252"
        onPress={() => {
          ref.current.animateNextTransition();
          setShowText(!showText);
        }}
      />
      {showText && (
        <Text style={styles.text}>Tap the above button to hide me</Text>
      )}
    </Transitioning.View>
  );
}

const styles = StyleSheet.create({
  centerAll: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    margin: 10,
  },
});

export default Sequence;
