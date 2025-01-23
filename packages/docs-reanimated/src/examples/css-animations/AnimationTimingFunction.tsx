import React, { useReducer } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { steps } from 'react-native-reanimated';

const stepsModifiers = [
  'jumpStart',
  'jumpEnd',
  'jumpNone',
  'jumpBoth',
] as const;

export default function App() {
  const [isToggled, toggle] = useReducer((s) => !s, false);

  return (
    <View style={styles.container}>
      {stepsModifiers.map((step) => (
        <Animated.View
          key={step}
          style={[
            styles.box,
            {
              width: isToggled ? '100%' : 100,
              transitionProperty: 'width',
              transitionDuration: '2s',
              // highlight-next-line
              transitionTimingFunction: steps(6, step),
            },
          ]}>
          <Text style={styles.label}>{step}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 4,
  },
  box: {
    height: 28,
    backgroundColor: '#b58df1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: 'white',
    fontWeight: 'bold',
  },
});
