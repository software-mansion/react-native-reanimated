import React, { useReducer } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated from 'react-native-reanimated';

const COLORS = ['#fa7f7c', '#b58df1', '#ffe780', '#82cab2', '#87cce8'];

export default function App() {
  const [isToggled, toggle] = useReducer((s) => !s, false);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {COLORS.map((color, id) => (
          <Animated.View
            key={color}
            style={[
              styles.box,
              {
                backgroundColor: color,
                transform: [{ rotateY: isToggled ? '0deg' : '180deg' }],
                borderRadius: isToggled ? 16 : 0,
                transitionProperty: ['transform', 'borderRadius'],
                // highlight-next-line
                transitionDuration: [400 * id + 500, '0.5s'],
              },
            ]}
          />
        ))}
      </View>
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
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  box: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginVertical: 64,
  },
});
