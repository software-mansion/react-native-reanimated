import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, processColor, Platform, StatusBar, UIManager, findNodeHandle } from 'react-native';
import Animated, { Transitioning, Transition } from 'react-native-reanimated';
import { FlatList as GHFlatList, State, PanGestureHandler, RectButton, ScrollView } from 'react-native-gesture-handler';

const {
  add,
  and,
  call,
  callback,
  cond,
  createAnimatedComponent,
  debug,
  defined,
  eq,
  event,
  greaterOrEq,
  invoke,
  lessOrEq,
  map,
  neq,
  onChange,
  proc,
  set,
  Text,
  useCode,
  Value,
  View,
  acc,
  divide,
  concat,
  block
} = Animated;

const FlatList = createAnimatedComponent(GHFlatList);

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

const successMap = proc((x, y, w, h) => map([0, 0, w, h, x, y]));

const measureView1 = proc((tag, cb) => cond(defined(tag), invoke('UIManager', 'measure', tag, cb)));

const measureView = proc((tag, fruit, x, y, w, h) => {
  const mapping = successMap(x, y, w, h);
  const measure = invoke('UIManager', 'measure', tag, callback.fromMap(mapping) /*callback(0, 0, w, h, x, y)*/);
  return block([
    cond(defined(tag), measure),
    debug('measured', concat(tag, ' ', fruit))
  ]);
});

const relativeMeasureView = proc((tag, relTo, success, error) => cond(defined(tag), invoke('UIManager', 'measureLayout', tag, relTo, success, error)));

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
    const height = StatusBar.currentHeight || 0;
    if (height === 0 || Platform.OS !== 'android') return 0;

    // Android measurements do not account for StatusBar, so we must do so manually.
    const hidden = StatusBar.currentValues && StatusBar.currentValues.hidden && StatusBar.currentValues.hidden.value || false;
    const translucent = StatusBar.currentValues && StatusBar.currentValues.translucent || false;
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

function Item({ item, parent, evaluate, x, y, index }) {
  const ref = useRef();
  const values = useMemo(() => new Array(4).fill(0).map(() => new Value(0)), []);
  const [ax, ay, width, height] = values;
  const statusBarHeight = useStatusBarHeight();
  const bgc = useMemo(() => new Value(processColor('transparent')), []);
  const [tag, onLayout] = useLayout();
  const relativeMeasurements = useMemo(() => new Array(4).fill(0).map(() => new Value(0)), []);

  useCode(() =>
    cond(
      and(neq(tag, 0), neq(evaluate, -1)),
      [
        tag,
        measureView(tag, item.title, ax, ay, width, height),
        measureView1(tag, callback.fromEnd(assert => debug('assert callback.fromEnd, correct? 1 == ', eq(assert, ay)))),
        measureView1(tag, callback.fromMap(map.fromEnd([assert => debug('assert map.fromEnd, correct? 1 == ', eq(assert, ay))]))),
        measureView1(tag, callback.fromMap(map([assert => debug('assert map([].fromEnd()), correct? 1 == ', eq(assert, ay))].fromEnd()))),
        debug('parent tag', tag),
        relativeMeasureView(tag, parent, debug('relativeMeasureView', callback(...relativeMeasurements)), callback())
      ]
    ),
    [tag, parent]
  );

  useCode(() =>
    set(bgc, cond(inRect(x, y, ax, ay, width, height, statusBarHeight), processColor(item.color), processColor('transparent'))),
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

function Shuffle() {
  const transition = (
    <Transition.Together>
      <Transition.Change interpolation="easeInOut" />
    </Transition.Together>
  );

  const [items, setItems] = useState([
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
    {
      title: '🍇 Grapes1',
      color: 'purple'
    },
    {
      title: '🍈 Melon1',
      color: 'lightgreen'
    },
    {
      title: '🍉 Watermelon1',
      color: 'red'
    },
    {
      title: '🍊 Tangerine1',
      color: 'orange'
    },
    {
      title: '🍋 Lemon1',
      color: 'yellow'
    },
    {
      title: '🍌 Banana1',
      color: 'gold'
    },
  ]);
  const ref = useRef();
  const [tag, onLayout] = useLayout();

  const absoluteX = useMemo(() => new Value(-1), []);
  const absoluteY = useMemo(() => new Value(-1), []);
  const evaluate = useMemo(() => debug('eval', new Value(0)), []);
  const holder = useMemo(() => debug('eval', new Value(0)), []);

  const onScrollSetEvaluate = useMemo(() =>
    event([{
      nativeEvent: () => set(evaluate, add(evaluate, 1))
    }]),
    [evaluate]
  );

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
  ), [tag, evaluate, absoluteX, absoluteY]);

  const keyExtractor = useCallback((item) => item.title, []);

  const panRef = useRef();
  const scrollRef = useRef();

  useCode(() =>
    call([evaluate], console.log),
    [evaluate]
  );

  useEffect(() => {
    //setTimeout(() => UIManager.measureLayout(findNodeHandle(scrollRef.current), findNodeHandle(ref.current), console.log, console.warn), 5000)
  }, [])

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      ref={panRef}
      simultaneousHandlers={scrollRef}
    >
      <View collapsable={false} style={styles.default}>
        <Transitioning.View
          ref={ref}
          collapsable={false}
          transition={transition}
          style={styles.centerAll}
          animateMount
          onLayout={onLayout}
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

                //  an ugly workaround until `onTransitionStateChange` will be available on both platforms (hopefully!)
                setTimeout(() => evaluate.setValue(add(evaluate, 1)), 500);
                setTimeout(() => evaluate.setValue(add(evaluate, 1)), 1500);
              }}
            >
              <Text
                style={[
                  styles.button,
                  {
                    //backgroundColor: "#FF5252"
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
              onScrollEndDrag={onScrollSetEvaluate}
              onMomentumScrollEnd={onScrollSetEvaluate}
              renderScrollComponent={(props) => {
                //ref.current.animateNextTransition();
                return (
                  <ScrollView
                    {...props}
                    ref={scrollRef}
                    waitFor={panRef}
                  />
                );
              }}
            //scrollEnabled={false}
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
