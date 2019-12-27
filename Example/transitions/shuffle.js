import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Text, View, StyleSheet, Button, StatusBar, processColor } from 'react-native';
import Animated, { Transitioning, Transition, TransitionState, Value, event, useCode, block, set, onChange, add, neq, cond, eq, call } from 'react-native-reanimated';

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

const AnimatedButton = Animated.createAnimatedComponent(Button);

function Shuffle() {
  const transition = (
    <Transition.Together>
      <Transition.Change interpolation="easeInOut" />
    </Transition.Together>
  );

  const transitionState = useMemo(() => new Value(TransitionState.END), []);
  const color = cond(neq(transitionState, TransitionState.BEGAN), processColor("#FF5252"), processColor("blue"));


  const onTransition = useMemo(() =>
    event([{
      nativeEvent: { state: transitionState }
    }]),
    [transitionState]
  );

  let [items, setItems] = useState([
    '🍇 Grapes',
    '🍈 Melon',
    '🍉 Watermelon',
    '🍊 Tangerine',
    '🍋 Lemon',
    '🍌 Banana',
  ]);
  const ref = useRef();

  const children = items.map(item => (
    <Text style={styles.text} key={item}>
      {item}
    </Text>
  ));

  return (
    <Transitioning.View
      ref={ref}
      transition={transition}
      style={styles.centerAll}
      onTransitionStateChange={onTransition}
    >
      <AnimatedButton
        title="shuffle"
        style={{ backgroundColor: color }}
        onPress={() => {
          ref.current.animateNextTransition(() => console.log('Transition end!'));
          const shuffled = items.slice();
          shuffle(shuffled);
          setItems(shuffled);
        }}
      />
      {children}
    </Transitioning.View>
  );
}

const styles = StyleSheet.create({
  centerAll: {
    flex: 1,
    alignItems: 'center',
    marginTop: 100,
  },
  text: {
    marginTop: 10,
  },
});

export default Shuffle;
