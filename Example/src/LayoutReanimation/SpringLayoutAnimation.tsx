import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';

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

export function SpringLayoutAnimation(): React.ReactElement {
  const [state, setState] = useState(true);
  return (
    <View style={{ marginTop: 30 }}>
      <View style={{ height: 300 }}>
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
  box: {
    margin: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: 'black',
    width: 60,
    height: 60,
  },
});
