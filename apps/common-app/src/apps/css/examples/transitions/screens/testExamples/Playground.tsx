import { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Button, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

const transitionStyles: Array<ViewStyle> = [
  {
    boxShadow: '0 0 20px 30px blue',
  },
  {
    boxShadow: 'inset 20px 30px green',
  },
];

export default function Playground() {
  const [state, setState] = useState(0);
  const stateToStyle = (num: number) => {
    return transitionStyles[num % transitionStyles.length];
  };

  return (
    <View style={styles.container}>
      <Button
        title="Change state"
        onPress={() => {
          setState(state + 1);
        }}
      />
      <Animated.View
        style={[
          {
            backgroundColor: 'red',
            height: 120,
            marginTop: 60,
            transitionDuration: '2s',
            transitionProperty: 'all',
            transitionTimingFunction: 'ease-in-out',
            width: 120,
          },
          stateToStyle(state),
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
