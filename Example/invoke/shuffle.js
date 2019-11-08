import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Text, StyleSheet, Button, findNodeHandle, UIManager } from 'react-native';
import Animated, { Transitioning, Transition } from 'react-native-reanimated';
import { FlatList } from 'react-native-gesture-handler';
import * as _ from 'lodash';

const {
  useCode,
  block,
  defined,
  cond,
  invoke,
  call,
  and,
  Value,
  set,
  View,
  proc
} = Animated;

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

const measurer = proc((tag, a, b, c, d, e, f) => cond(defined(), invoke('UIManager', 'measure', tag, [a, b, c, d, e, f])));

const keys = ['x', 'y', 'width', 'height', 'screenX', 'screenY'];

function Item({ item, parent }) {
  const ref = useRef();
  const values = useMemo(() => new Array(6).fill(0).map(() => new Value(0)), []);
  

  const m = useCallback(() => {
    const handle = findNodeHandle(ref.current);
    const handleParent = findNodeHandle(parent.current);
    handle && handleParent && UIManager.measureLayout(
      handle,
      handleParent,
      () => console.warn('measureLayout'),
      (...o) => console.log('measured', o)
    )
  }, [ref, parent]);

  useCode(
    block([
      findNodeHandle(ref.current) ? invoke('UIManager', 'measure', findNodeHandle(ref.current), values) : 0,
      //findNodeHandle(ref.current) && findNodeHandle(parent.current) ? invoke('UIManager', 'measureLayout', findNodeHandle(ref.current), findNodeHandle(parent.current), [{ a: new Value() }], values):0,
    ])
  );

  useCode(
    call(values, v => console.log(item, _.zipObject(keys,v))),
    [values]
  );

  //<View style={[StyleSheet.absoluteFill, styles.text, { transform: [{translateX: values[5]}], backgroundColor: 'pink'}]} pointerEvent="none" / >
  return (
    <Text style={styles.text} ref={ref} collapsable={false} onLayout={m}>
      {item}
    </Text>
  );
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
   
  const measure = useMemo(() => new Value(0), []);
  const renderItem = useCallback(({ item }) => <Item item={item} parent={ref} />, [ref]);
  const keyExtractor = useCallback((item) => item, []);

  return (
    <Transitioning.View
      ref={ref}
      collapsable={false}
      transition={transition}
      style={styles.centerAll}
    >
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
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
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
