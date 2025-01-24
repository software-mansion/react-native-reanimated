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
            alignSelf: isToggled ? 'flex-start' : 'flex-end',
            backgroundColor: isToggled ? '#fa7f7c' : '#82cab2',
            transitionProperty: ['alignSelf', 'backgroundColor'],
            transitionDuration: '1s',
            // highlight-next-line
            transitionBehavior: 'allowDiscrete',
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
    margin: 64,
  },
});
