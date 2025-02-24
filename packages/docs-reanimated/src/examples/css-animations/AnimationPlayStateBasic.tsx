import React, { useReducer } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated, { CSSAnimationKeyframes } from 'react-native-reanimated';

const change: CSSAnimationKeyframes = {
  from: {
    width: 120,
    backgroundColor: '#ffe780',
  },
  to: {
    width: 240,
    backgroundColor: '#b58df1',
  },
};

export default function App() {
  const [isToggled, toggle] = useReducer((s) => !s, false);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: change,
            animationDuration: '1s',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            // highlight-next-line
            animationPlayState: isToggled ? 'paused' : 'running',
          },
        ]}
      />
      <Button onPress={toggle} title={isToggled ? 'play' : 'pause'} />
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
