import React, { useReducer } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated from 'react-native-reanimated';

const justify = ['start', 'space-between', 'end'] as const;
const colors = ['#82cab2', '#fa7f7c', '#b58df1'];

export default function App() {
  const [state, toggle] = useReducer((s) => (s + 1) % 3, 0);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.row,
          {
            justifyContent: justify[state] as 'start' | 'space-between' | 'end',
            transitionProperty: ['justifyContent'],
            transitionDuration: '1s',
            // highlight-next-line
            transitionBehavior: 'allow-discrete',
          },
        ]}>
        {colors.map((_, id) => (
          <Animated.View
            key={id}
            style={[
              styles.box,
              {
                backgroundColor: colors[state],
                transitionProperty: 'backgroundColor',
                transitionDuration: '1s',
              },
            ]}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.row,
          {
            justifyContent: justify[state] as 'start' | 'space-between' | 'end',
            transitionProperty: ['justifyContent'],
            transitionDuration: '1s',
            // highlight-next-line
            transitionBehavior: 'normal',
          },
        ]}>
        {colors.map((_, id) => (
          <Animated.View
            key={id}
            style={[
              styles.box,
              {
                backgroundColor: colors[state],
                transitionProperty: 'backgroundColor',
                transitionDuration: '1s',
              },
            ]}
          />
        ))}
      </Animated.View>
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
    width: '100%',
  },
  box: {
    height: 80,
    width: 80,
    backgroundColor: '#82cab2',
    margin: 8,
  },
});
