import Animated, { Layout } from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';

function Box({ label, state }: { label: string; state: boolean }) {
  const ind = label.charCodeAt(0) - 'A'.charCodeAt(0);
  const delay = 300 * ind;

  return (
    <Animated.View
      layout={Layout.delay(delay).springify()}
      style={[
        styles.box,
        {
          flexDirection: state ? 'row' : 'row-reverse',
          height: state ? 30 : 60,
        },
      ]}>
      <Text> {label} </Text>
    </Animated.View>
  );
}

export default function SpringLayoutAnimation() {
  const [state, setState] = useState(true);
  return (
    <View style={styles.marginTop}>
      <View style={styles.height}>
        <View style={{ flexDirection: state ? 'row' : 'column' }}>
          {state && <Box key="a" label="A" state={state} />}
          <Box key="b" label="B" state={state} />
          {!state && <Box key="a" label="A" state={state} />}
          <Box key="c" label="C" state={state} />
        </View>
      </View>

      <Button
        onPress={() => {
          setState(!state);
        }}
        title="toggle"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 30,
  },
  height: {
    height: 300,
  },
  box: {
    margin: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: 'black',
    width: 60,
    height: 60,
  },
});
