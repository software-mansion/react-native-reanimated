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
            transform: [{ translateX: isToggled ? 150 : -150 }],
            transitionProperty: 'transform',
            // highlight-next-line
            transitionDuration: isToggled ? '300ms' : '1.5s',
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
    backgroundColor: '#fa7f7c',
    // borderRadius: 20,
    marginVertical: 64,
  },
});
