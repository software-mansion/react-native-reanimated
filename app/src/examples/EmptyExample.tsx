import { StyleSheet, View, Button } from 'react-native';

import Animated, { useLayoutWorklet } from 'react-native-reanimated';
import React from 'react';

function noop() {}

export default function EmptyExample() {
  const [width, setWidth] = React.useState(100);

  const onLayoutWorklet = useLayoutWorklet((layout) => {
    console.log(_WORKLET, layout);
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.box, { width }]}
        onLayout={noop}
        // @ts-expect-error TODO
        thisCanBeAnything={onLayoutWorklet}
      />
      <Button
        title="change width"
        onPress={() => setWidth(Math.random() * 300)}
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
  box: {
    height: 100,
    backgroundColor: 'red',
  },
});
