import React, { useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, processColor, Platform, StatusBar } from 'react-native';
import Animated, { Transitioning, Transition } from 'react-native-reanimated';
import { FlatList, State, PanGestureHandler, RectButton, ScrollView } from 'react-native-gesture-handler';

const {
  add,
  and,
  callback,
  cond,
  defined,
  debug,
  eq,
  event,
  greaterOrEq,
  invoke,
  lessOrEq,
  map,
  neq,
  proc,
  set,
  Text,
  useCode,
  Value,
  View,
  onChange,
} = Animated;

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

const successMap = proc((x, y, w, h) => map([0, 0, w, h, x, y]));

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
  const onLayout = useCallback((e) => tag.setValue(e.nativeEvent.target), [tag]);
  return [tag, onLayout];
}

function Item({ item, parent, evaluate, x, y, index }) {
  const ref = useRef();
  const values = useMemo(() => new Array(4).fill(0).map(() => new Value(0)), []);
  const [ax, ay, width, height] = values;
  const statusBarHeight = useStatusBarHeight();
  const bgc = useMemo(() => new Value(processColor('transparent')), []);
  const [tag, onLayout] = useLayout();

  useCode(() =>
    cond(
      and(neq(tag, 0), neq(evaluate, -1)),
      [
        measureView(tag, callback(successMap(ax, debug('measured abs y', ay), width, height))),
        measureView(tag, callback.fromEnd(assert => debug('assert callback.fromEnd, correct? 1 == ', eq(assert, ay)))),
        measureView(tag, callback(map.fromEnd([assert => debug('assert map.fromEnd, correct? 1 == ', eq(assert, ay))]))),
        measureView(tag, callback(map([assert => debug('assert map([].fromEnd()), correct? 1 == ', eq(assert, ay))].fromEnd())))
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
  const evaluate = useMemo(() => new Value(0), []);

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

  const panRef = useRef();
  const scrollRef = useRef();

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      ref={panRef}
      simultaneousHandlers={scrollRef}
    >
      <View collapsable={false} style={styles.default} onLayout={onLayout}>
        <Transitioning.View
          ref={ref}
          collapsable={false}
          transition={transition}
          style={styles.centerAll}
          animateMount
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
                    backgroundColor: "#FF5252"
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
              renderScrollComponent={(props) => <ScrollView {...props} ref={scrollRef} waitFor={panRef} onScroll={onScrollSetEvaluate} />}
              scrollEnabled={false}
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
