import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, Button, findNodeHandle, UIManager, processColor, Platform, StatusBar } from 'react-native';
import Animated, { Transitioning, Transition } from 'react-native-reanimated';
import { FlatList, State, PanGestureHandler } from 'react-native-gesture-handler';
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
  proc,
  event,
  eq,
  greaterOrEq,
  lessOrEq,
  add,
  Text
} = Animated;

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

const measurer = proc((tag, a, b, c, d, e, f) => cond(defined(), invoke('UIManager', 'measure', tag, [a, b, c, d, e, f])));

const isInRect = proc((x, y, left, top, right, bottom) => and(
  greaterOrEq(x, left),
  lessOrEq(x, right),
  greaterOrEq(y, top),
  lessOrEq(y, bottom)
));

const inRect = proc((x, y, left, top, width, height, statusBarHeight) => isInRect(x, y, left, top, add(left, width, statusBarHeight), add(top, height, statusBarHeight)));

/**
 *  android measurements of the screen seem to be affected by the StatusBar only before mounting of the component
 *  this is why this hook is a evaluate once hook
 * */
export function useStatusBarHeight() {
  return useMemo(() => {
    const height = _.defaultTo(StatusBar.currentHeight, 0);
    if (height === 0 || Platform.OS !== 'android') return 0;

    // Android measurements do not account for StatusBar, so we must do so manually.
    const hidden = _.get(StatusBar, '_currentValues.hidden.value', false);
    const translucent = _.get(StatusBar, '_currentValues.translucent', false);
    const visible = !hidden && !translucent;
    return visible ? height : 0;
  }, []);
}

const keys = ['x', 'y', 'width', 'height', 'screenX', 'screenY'];

function Item({ item, parent, x, y }) {
  const ref = useRef();
  const values = useMemo(() => new Array(6).fill(0).map(() => new Value(0)), []);
  const [rx, ry, width, height, ax, ay] = values;
  const statusBarHeight = useStatusBarHeight();
  const bgc = useMemo(() =>
    cond(inRect(x, y, ax, ay, width, height, statusBarHeight), processColor(item.color), processColor('transparent')),
    [x, y, ax, ay, width, height, statusBarHeight, item.color]
  );
  

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
  
  return (
    <Text style={[styles.text, {backgroundColor:bgc}]} ref={ref} collapsable={false} onLayout={m}>
      {item.title}
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
    {
      title: '🍇 Grapes',
      color: 'purple'
    },
    {
      title: '🍈 Melon',
      color: 'lightgreen'
    },
    {
      title: '🍉 Watermelon',
      color: 'red'
    },
    {
      title: '🍊 Tangerine',
      color: 'orange'
    },
    {
      title: '🍋 Lemon',
      color: 'yellow'
    },
    {
      title: '🍌 Banana',
      color: 'gold'
    },
  ]);
  const ref = useRef();
   
  const absoluteX = useMemo(() => new Value(-1), []);
  const absoluteY = useMemo(() => new Value(-1), []);
  const renderItem = useCallback(({ item }) => <Item item={item} parent={ref} x={absoluteX} y={absoluteY} />, [ref, absoluteX, absoluteY]);
  const keyExtractor = useCallback((item) => item.title, []);

  const onGestureEvent = useMemo(() =>
    event([{
      nativeEvent: {
        absoluteX,
        absoluteY
      }
    }]),
    [absoluteX, absoluteY]
  );

  const onHandlerStateChange = useMemo(() =>
    event([{
      nativeEvent: {
        oldState: s => cond(
          eq(s, State.ACTIVE),
          [
            set(absoluteX, -1),
            set(absoluteY, -1),
          ]
        )
      }
    }]),
    [absoluteX, absoluteY]
  );

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <View collapsable={false} style={{ flex: 1 }}>
        <Transitioning.View
          ref={ref}
          collapsable={false}
          transition={transition}
          style={styles.centerAll}
        >
          <Text style={styles.text}>Drag your finger over the list</Text>
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
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  centerAll: {
    flex: 1,
    alignItems: 'center',
    marginTop: 100,
  },
  text: {
    marginVertical: 10,
  },
});

export default Shuffle;
