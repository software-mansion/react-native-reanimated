import React, { useState, useRef } from 'react';
import { Text, View, StyleSheet, Button, StatusBar } from 'react-native';
import { Transitioning, Transition } from 'react-native-reanimated';

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

function Shuffle() {
  const transition = (
    <Transition.Together>
      <Transition.Change interpolation="easeInOut" />
    </Transition.Together>
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
      style={styles.centerAll}>
      <Button
        title="shuffle"
        color="#FF5252"
        onPress={() => {
          ref.current.animateNextTransition();
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
