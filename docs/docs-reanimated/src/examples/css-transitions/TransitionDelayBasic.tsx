import React, { useReducer } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated from 'react-native-reanimated';

export default function App() {
  const [isToggled, toggle] = useReducer((s) => !s, false);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            width: isToggled ? 240 : 120,
            transitionProperty: 'width',
            transitionDuration: 300,
            // highlight-next-line
            transitionDelay: 400,
          },
        ]}
      />
      <Button onPress={toggle} title="Click me" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  box: {
    height: 120,
    width: 120,
    marginVertical: 64,
    backgroundColor: '#82cab2',
  },
});
