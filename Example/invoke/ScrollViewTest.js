import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Dimensions, findNodeHandle, Image, NativeModules, UIManager, processColor, Sound } from 'react-native';
import Animated from 'react-native-reanimated';
import { PanGestureHandler, State, RectButton, TapGestureHandler } from 'react-native-gesture-handler';
import AnimatedTimePicker from './TimePicker';
import { runDecay } from '../imageViewer';


const { interpolate, cond, eq, add, call, set, Value, event, concat, sub, color, invoke, dispatch,useCode, or,Code, map, callback, neq, createAnimatedComponent, View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

//const pipper = invoke((a, b, c)=>)
const P = createAnimatedComponent(PanGestureHandler);
const Button = createAnimatedComponent(RectButton);

//const measureLayout = proc((tag, parentTag, x, error) => cond(defined(tag, -1), invoke('UIManager', 'measureLayout', tag, parentTag, [error], { x })));
const scrollTo = proc((tag, scrollX, scrollY, animated) => cond(defined(tag, -1), dispatch('RCTScrollView', 'scrollTo', tag, scrollX, scrollY, animated)));
const scrollBy = proc((tag, scrollX, scrollY, scrollByX, scrollByY, animated) => scrollTo(tag, add(scrollX, scrollByX), add(scrollY, scrollByY), animated))
const cb = proc((x) => callback({ x }));
const scrollEvent = proc((x, y) => event([{ nativeEvent: { contentOffset: { x, y } } }]));

export default function E() {
  //const ref = React.useRef();
  const [h, setH] = React.useState();
  const [q, setQ] = React.useState();
  const x = useMemo(() => new Value(0), []);
  const scroll = useMemo(() => new Value(0), []);
  const scrollX = useMemo(() => new Value(0), []);
  const scrollY = useMemo(() => new Value(0), []);
  const clockX = useMemo(() => new Clock(), []);
  const clockY = useMemo(() => new Clock(), []);
  const dest = useMemo(() => new Value(1), []);
  const finalScroll = useMemo(() => interpolate(dest, {
    inputRange: [0, 1],
    outputRange: [50, 200],
  }), []);
  const state = useMemo(() => new Value(State.UNDETERMINED), []);
  const appState = useMemo(() => new Value("initialAppState"), []);
  const isScrolling = useMemo(() => new Value(0), []);
  const error = useMemo(() => new Value(0), []);

  const onScroll = useMemo(() => event([{ nativeEvent: { contentOffset: { x: scrollX, y: scrollY } } }]), [scrollX, scrollY]);
  const onScrollStateChange = useMemo(() => event([{ nativeEvent: { state: s => set(isScrolling, or(eq(s, State.BEGAN), eq(s, State.ACTIVE))) } }]), [isScrolling]);
  //const onScroll = useMemo(() => scrollEvent(scrollX, scrollY), [scrollX, scrollY]);
  const onButtonPress = useMemo(() => event([{ nativeEvent: { oldState: state } }]), [state]);


  const translationX = useMemo(() => new Value(0), []);
  const translationY = useMemo(() => new Value(0), []);
  const velocityX = useMemo(() => new Value(0), []);
  const velocityY = useMemo(() => new Value(0), []);
  const finalScrollX = useMemo(() => new Value(0), []);
  const finalScrollY = useMemo(() => new Value(0), []);
  const panState = useMemo(() => new Value(State.UNDETERMINED), []);
  const onPan = useMemo(() =>
    event([{
    nativeEvent: {
      translationX,
      translationY,
      velocityX,
      velocityY,
      oldState: panState
    }
    }]),
    [
      translationX,
      translationY,
      velocityX,
      velocityY,
      panState
    ]
  );

  useCode(
    block([
      cond(
        eq(panState, State.ACTIVE),
        [
          set(finalScrollX, runDecay(clockX, scrollX, multiply(velocityX, -1))),
          set(finalScrollY, runDecay(clockY, scrollY, multiply(velocityY, -1))),
          set(translationX, 0),
          set(translationY, 0),          
          cond(clockRunning(clockX), 0, set(finalScrollX, add(finalScrollX, 0))),
          cond(clockRunning(clockY), 0, set(finalScrollY, add(finalScrollY, 0)))
        ],
        [
          cond(clockRunning(clockX), set(finalScrollX, add(finalScrollX, 0))),
          cond(clockRunning(clockY), set(finalScrollY, add(finalScrollY, 0))),
          stopClock(clockX),
          stopClock(clockY)
        ]
      ),
      call([scrollY, panState], console.log),
      scrollTo(h, sub(finalScrollX, translationX), sub(finalScrollY, translationY), 0)
    ]),
    [h, translationX, scrollX, translationY, scrollY, panState, finalScrollX, scrollX, finalScrollY, scrollY, clockX, clockY, velocityX, velocityY]
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
    <ScrollView
      style={styles.scrollView}
      collapsable={false}
    >
      <Image source={require('../imageViewer/grid.png')} collapsable={false} />
    </ScrollView>
  );

  const animatedScrollComponent = (
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
      >
        <Image source={require('../imageViewer/grid.png')} collapsable={false} ref={(r) => setQ(findNodeHandle(r))} />
      </ScrollView>
    </PanGestureHandler>
  );

  return (
    <View style={{ flex: 1 }}>
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
  }
})