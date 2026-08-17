import React, { useState } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated from 'react-native-reanimated';

const COLORS = ['#87cce8', '#fa7f7c', '#82cab2', '#b58df1', '#ffd25f'];

export default function App() {
  const [width, setWidth] = useState(120);
  const [backgroundColor, setBackgroundColor] = useState(COLORS[0]);

  const randomize = () => {
    setWidth(120 + Math.round(Math.random() * 140));
    setBackgroundColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            width,
            backgroundColor,
            // highlight-next-line
            transitionProperty: ['width', 'backgroundColor'],
            transitionDuration: 500,
          },
        ]}
      />
      <Button onPress={randomize} title="Randomize" />
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
  },
});
