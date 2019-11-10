import React, { useMemo } from 'react';
import { findNodeHandle, Image, StyleSheet, UIManager } from 'react-native';
import { PanGestureHandler, State, TapGestureHandler } from 'react-native-gesture-handler';
import Animated, { Easing } from 'react-native-reanimated';


const { interpolate, cond, eq, timing, add, call, max, set, Text, Value, event, decay, concat, divide, abs, sub, color, invoke, dispatch, useCode, or, Code, map, callback, neq, createAnimatedComponent, View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

const decelerationRate = 0.995;

function runDecay(clock, value, velocity) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  const config = { deceleration: decelerationRate };

  return [
    cond(
      not(clockRunning(clock)),
      [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, value),
      set(state.time, 0),
      startClock(clock),
    ]),
    decay(clock, state, config),
    cond(state.finished, stopClock(clock)),
    state.position,
  ];
}

//const measureLayout = proc((tag, parentTag, x, error) => cond(defined(tag, -1), invoke('UIManager', 'measureLayout', tag, parentTag, [error], { x })));

function resolveScrollViewNS(horizontal = false) {
  const fallback = 'RCTScrollView';
  return Platform.select({
    android: horizontal ? 'AndroidHorizontalScrollView' : fallback,
    default: fallback
  })
}

const scrollTo = proc((tag, scrollX, scrollY, animated) => cond(defined(tag, -1), dispatch(resolveScrollViewNS(), 'scrollTo', tag, scrollX, scrollY, animated)));
const scrollBy = proc((tag, scrollX, scrollY, scrollByX, scrollByY, animated) => scrollTo(tag, add(scrollX, scrollByX), add(scrollY, scrollByY), animated))
const cb = proc((x) => callback({ x }));
const sign = proc((x) => divide(x, abs(x)));
const decayVelocity = proc((v) => cond(eq(v, 0), 1, multiply(v, -1)));
const scrollEvent = proc((x, y) => event([{ nativeEvent: { contentOffset: { x, y } } }]));

export default function ControlledScrollView(props) {
  //const ref = React.useRef();
  const [h, setH] = React.useState();
  const [q, setQ] = React.useState();
  const x = useMemo(() => new Value(0), []);
  const scroll = useMemo(() => new Value(0), []);
  const scrollX = useMemo(() => new Value(0), []);
  const scrollY = useMemo(() => new Value(0), []);
  const scrollXBegin = useMemo(() => new Value(0), []);
  const scrollYBegin = useMemo(() => new Value(0), []);
  const clockX = useMemo(() => new Clock(), []);
  const clockY = useMemo(() => new Clock(), []);
  const dest = useMemo(() => new Value(1), []);
  const finalScroll = useMemo(() => interpolate(dest, {
    inputRange: [0, 1],
    outputRange: [50, 200],
  }), []);
  const state = useMemo(() => new Value(State.UNDETERMINED), []);
  const isScrolling = useMemo(() => new Value(0), []);
  
  const onScrollStateChange = useMemo(() => event([{ nativeEvent: { state: s => set(isScrolling, or(eq(s, State.BEGAN), eq(s, State.ACTIVE))) } }]), [isScrolling]);
  //const onScroll = useMemo(() => scrollEvent(scrollX, scrollY), [scrollX, scrollY]);
  const onButtonPress = useMemo(() => event([{ nativeEvent: { oldState: state } }]), [state]);


  const translationX = useMemo(() => new Value(0), []);
  const translationY = useMemo(() => new Value(0), []);
  const velocityX = useMemo(() => new Value(0), []);
  const velocityY = useMemo(() => new Value(0), []);
  const finalScrollX = useMemo(() => new Value(0), []);
  const finalScrollY = useMemo(() => new Value(0), []);
  const panOldState = useMemo(() => new Value(State.UNDETERMINED), []);
  const panState = useMemo(() => new Value(State.UNDETERMINED), []);
  const onPan = useMemo(() =>
    event([{
      nativeEvent: {
        translationX,
        translationY,
        velocityX,
        velocityY,
        state: panState,
        oldState: panOldState
      }
    }]),
    [
      translationX,
      translationY,
      velocityX,
      velocityY,
      panState,
      panOldState
    ]
  );

  const onScroll = useMemo(() =>
    event([{
      nativeEvent: ({ contentOffset: { x, y } }) => cond(
          neq(panOldState, State.ACTIVE),
          [
            set(scrollX, x),
            set(scrollY, y),
          ]
        )
      
    }]),
    [panOldState, scrollX, scrollY]
  );
  

  useCode(
    cond(
      eq(panOldState, State.ACTIVE),
      [
        clockX,
        set(finalScrollX, 0),
        //set(finalScrollX, runDecay(clockX, scrollX, props.horizontal && Platform.OS === 'android' ? decayVelocity(velocityX) : Platform.OS !== 'android' ? decayVelocity(velocityX):0)),
        set(finalScrollY, runDecay(clockY, scrollY, decayVelocity(velocityY))),
        set(translationX, 0),
        set(translationY, 0),
        scrollTo(h, max(finalScrollX, 0), max(finalScrollY, 0), 0),
        set(scrollXBegin, finalScrollX),
        set(scrollYBegin, finalScrollY),
        call([scrollX, scrollY, finalScrollX, finalScrollY], e => console.log('scroll', e)),
      ],
      [
        cond(clockRunning(clockX), stopClock(clockX)),
        cond(clockRunning(clockY), stopClock(clockY)),
        scrollBy(h, scrollXBegin, scrollYBegin, multiply(translationX, -1), multiply(translationY, -1), 0)
      ]
    ),
    [h, panOldState, translationX, translationY, finalScrollX,finalScrollY, scrollX, scrollY, clockX, clockY, velocityX, velocityY]
  );

  const vibrate = useMemo(() => new Value(0), []);
  useCode(
    block([
      onChange(
        vibrate,
        cond(
          vibrate,
          [
            invoke('Vibration', 'vibrate', 500),
            set(vibrate, 0)
          ]
        )
      ),
    ]),
    [vibrate]
  );

  const baseScrollComponent = (
    <TapGestureHandler

    >
      <View style={styles.default} collapsable={false}>
        <ScrollView
          style={styles.scrollView}
          collapsable={false}
          decelerationRate={decelerationRate}
        >
          <Image source={require('../imageViewer/grid.png')} collapsable={false} />
        </ScrollView>
      </View>
    </TapGestureHandler>
  );

  const animatedScrollComponent = (
    <TapGestureHandler

    >
      <View style={styles.default} collapsable={false}>
        <PanGestureHandler
          onGestureEvent={onPan}
          onHandlerStateChange={onPan}
        >
          <ScrollView
            style={styles.scrollView}
            collapsable={false}
            ref={(r) => setH(findNodeHandle(r))}
            onScroll={onScroll}
            scrollEnabled={false}
            decelerationRate={decelerationRate}
          >
            <Image source={require('../imageViewer/grid.png')} collapsable={false} ref={(r) => setQ(findNodeHandle(r))} />
          </ScrollView>
        </PanGestureHandler>
      </View>
    </TapGestureHandler>
  );

  return (
    <View style={styles.default}>
      <Text>One ScrollView is a regular one, the other is actually controlled by a PanGestureHandler utilizing dispatch</Text>
      <Text>Tap on the one you think is the real one</Text>
      {baseScrollComponent}
      {animatedScrollComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    borderColor: 'blue',
    borderWidth: 2,
    margin: 5
  },
  default: {
    flex:1
  }
})