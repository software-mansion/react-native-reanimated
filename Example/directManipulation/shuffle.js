import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, Button, findNodeHandle, UIManager, processColor, Platform, StatusBar } from 'react-native';
import Animated, { Transitioning, Transition, TransitionState } from 'react-native-reanimated';
import { FlatList, State, PanGestureHandler, RectButton } from 'react-native-gesture-handler';
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
  Text,
  neq,
  Clock,
  startClock,
  clockRunning,
  sub,
  createAnimatedComponent,
  onChange,
  callback,
  map
} = Animated;

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

const cb = proc((x, y, w, h) => map([0, 0, w, h, x, y]));

const measureView = proc((tag, cb) => cond(defined(tag), invoke('UIManager', 'measure', tag, cb)));

const isInRect = proc((x, y, left, top, right, bottom) => and(
  greaterOrEq(x, left),
  lessOrEq(x, right),
  greaterOrEq(y, top),
  lessOrEq(y, bottom)
));

const inRect = proc((x, y, left, top, width, height, statusBarHeight) => isInRect(x, y, left, top, add(left, width, statusBarHeight), add(top, height, statusBarHeight)));

/**
 *  android measurements of the screen seem to be affected by the StatusBar only before mounting of the component
 *  this is why this hook is an evaluate once hook
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

function useLayout() {
  const tag = useMemo(() => new Value(0), []);
  const pip = useMemo(() => new Value(0), []);
  const onLayout = useCallback((e) => tag.setValue(e.nativeEvent.target), [tag]);
  const onLayoutE = useMemo(() =>
    event([{
      nativeEvent: {
        target: tag,
        layout: {
          width: pip
        }
      }
    }]),
    [tag, pip]
  )

  useCode(() =>
    call([pip, tag], console.log),
    [pip, tag]
  );

  return [tag, onLayout];
}

const keys = ['x', 'y', 'width', 'height', 'screenX', 'screenY'];

function delay(node, delayMs) {
  const clock = new Clock();
  const start = new Value();

  return block([
    cond(clockRunning(clock), 0, [
      set(start, clock),
      startClock(clock)
    ]),
    cond(greaterOrEq(sub(clock, start), delayMs), node)
  ]);
}

function Item({ item, parent, evaluate, x, y, index }) {
  const ref = useRef();
  const values = useMemo(() => new Array(4).fill(0).map(() => new Value(0)), []);
  const values1 = useMemo(() => new Array(4).fill(0).map(() => new Value(0)), []);
  const [ax, ay, width, height] = values;
  const statusBarHeight = useStatusBarHeight();
  const bgc = useMemo(() => new Value(processColor('transparent')), []);
  const measure = useMemo(() => new Value(0), []);
  const [tag, onLayout] = useLayout();


  /*
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
  */

  useCode(
    () => cond(
      and(neq(tag, 0), neq(evaluate, -1)),
      [
        measureView(tag, callback(cb(ax, ay, width, height))),
        //cond(neq(parent, 0), invoke('UIManager', 'measureLayout', tag, parent, callback(), callback(...values1))),
      ]
    ),
    [tag, parent]
  );

  useCode(
    () => set(bgc, cond(inRect(x, y, ax, ay, width, height, statusBarHeight), processColor(item.color), processColor('transparent'))),
    [bgc, x, y, ax, ay, width, height, statusBarHeight, item.color, index]
  );

  return (
    <Text
      style={[styles.text, { backgroundColor: bgc }]}
      ref={ref}
      collapsable={false}
      onLayout={onLayout}
    >
      {item.title}
    </Text>
  );
}

const AButton = createAnimatedComponent(Button);

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
  const [tag, onLayout] = useLayout();

  const absoluteX = useMemo(() => new Value(-1), []);
  const absoluteY = useMemo(() => new Value(-1), []);
  const evaluate = useMemo(() => new Value(0), []);
  const transitionState = useMemo(() => new Value(-1), []);

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

  const onTransition = useMemo(() =>
    event([{
      nativeEvent: ({ state }) => block([
        set(transitionState, state),
        onChange(state, cond(eq(state, TransitionState.END), set(evaluate, add(evaluate, 1))))
      ])
    }]),
    [evaluate, transitionState]
  );

  useCode(() => call([evaluate], console.log), [evaluate]);

  const renderItem = useCallback((props) => (
    <Item
      {...props}
      parent={tag}
      evaluate={evaluate}
      x={absoluteX}
      y={absoluteY}
    />
  ), [tag, absoluteX, absoluteY]);

  const keyExtractor = useCallback((item) => item.title, []);

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <View collapsable={false} style={styles.default} onLayout={onLayout}>
        <Transitioning.View
          ref={ref}
          collapsable={false}
          transition={transition}
          style={styles.centerAll}
          animateMount
          onTransitionStateChange={onTransition}
        >
          <View collapsable={false} style={styles.default}>
            <Text style={styles.text}>Drag your finger over the list</Text>
            <RectButton
              onPress={() => {
                ref.current.animateNextTransition(() => console.log('animateNextTransition end'));
                const shuffled = items.slice();
                shuffle(shuffled);
                setItems(shuffled);
              }}
            >
              <Text
                style={[
                  styles.button,
                  {
                    backgroundColor: cond(neq(transitionState, TransitionState.BEGAN), processColor("#FF5252"), processColor("grey"))
                  }
                ]}
              >
                SHUFFLE
                </Text>
            </RectButton>
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          </View>
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
  default: {
    flex: 1
  },
  button: {
    color: 'white',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    padding: 20,
    margin: 10
  }
});

export default Shuffle;
