import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Dimensions, findNodeHandle, Image, NativeModules, UIManager, processColor, Sound } from 'react-native';
import Animated from 'react-native-reanimated';
import { PanGestureHandler, State, RectButton, TapGestureHandler } from 'react-native-gesture-handler';
import AnimatedTimePicker from './TimePicker';
import ScrollViewTest from './ScrollViewTest';


const { interpolate, cond, eq, add, call, set, Value, event, concat, color, invoke, dispatch,useCode, or,Code, map, callback, neq, createAnimatedComponent, View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

//const pipper = invoke((a, b, c)=>)
const P = createAnimatedComponent(PanGestureHandler);
const Button = createAnimatedComponent(RectButton);

//const measureLayout = proc((tag, parentTag, x, error) => cond(defined(tag, -1), invoke('UIManager', 'measureLayout', tag, parentTag, [error], { x })));
const scrollTo = proc((tag, scrollX, scrollY, animated) => cond(defined(tag, -1), dispatch('RCTScrollView', 'scrollTo', tag, scrollX, scrollY, animated)));
const scrollBy = proc((tag, scrollX, scrollY, scrollByX, scrollByY, animated) => scrollTo(tag, add(scrollX, scrollByX), add(scrollY, scrollByY), animated))
const cb = proc((x) => callback({ x }));
const scrollEvent = proc((x, y) => event([{ nativeEvent: { contentOffset: { x, y } } }]));



function runSpring(clock, value, velocity, dest) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  const config = {
    damping: 7,
    mass: 1,
    stiffness: 121.6,
    overshootClamping: false,
    restSpeedThreshold: 0.001,
    restDisplacementThreshold: 0.001,
    toValue: new Value(0),
  };

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, value),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    spring(clock, state, config),
    cond(state.finished, stopClock(clock)),
    state.position,
  ];
}

export default function E() {
  //const ref = React.useRef();
  const [h, setH] = React.useState();
  const [q, setQ] = React.useState();
  const x = useMemo(() => new Value(0), []);
  const scroll = useMemo(() => new Value(0), []);
  const scrollX = useMemo(() => new Value(0), []);
  const scrollY = useMemo(() => new Value(0), []);
  const translationX = useMemo(() => new Value(0), []);
  const clock = useMemo(() => new Clock(), []);
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
  /*
  const anmatedScroll = useMemo(() => 
    scrollCommand === 'scrollTo' ?
      block([
        set(scroll, runSpring(clock, scroll, 0, finalScroll)),
        scrollTo(h, 50, scroll, 0),
    )
    */
  useCode(
    onChange(
      state,
      cond(
        eq(state, State.ACTIVE),
        [
          //stopClock(clock),
          set(dest, not(dest)),
          set(state, State.UNDETERMINED)
        ]
      )
      
    ),
    [state, dest, clock]
  );

  useEffect(() => {
    console.log('sdfsdf',q, h)
    q && h && UIManager.measureLayout(q, h, () => console.warn('e'), (...o) => console.log('measured', o));
    NativeModules.SoundManager.playTouchSound();
  }, [q, h])

  useCode(
    block([
      onChange(state, cond(eq(state, State.ACTIVE), invoke('AppState', 'getCurrentAppState', [{ app_state: appState }], {}))),
      call([appState], a => console.log('appState', a))
    ]),
    [appState, state]
  )

  useCode(
    block([
      //set(scroll, runSpring(clock, scroll, 0, finalScroll)),
      //scrollTo(h, 50, scroll, 0),
      //onChange(state, cond(eq(state, State.ACTIVE), scrollBy(h, scrollX, scrollY, 50, scroll, 1)))
      //cond(and(defined(q), defined(h)), invoke('UIManager', 'measureLayout', q, h, [error], [new Value(), new Value(), x])),
      //call([x], a=>console.log('x?', a))
      //invoke('ToastAndroid', 'showWithGravity', concat('hello from reanimated invoke', scroll), 200, 200)
      invoke('PermissionsAndroid', 'requestPermission', 'android.permission.VIBRATE', {title: 'hello', message: 'prompting'}),
      invoke('Vibration', 'vibrate', 500),
      invoke('SoundManager', 'playTouchSound'),
      
      invoke('ImageStoreManager', 'getBase64ForTag', "https://media.mnn.com/assets/images/2018/04/sunset_through_oak_tree.jpg.653x0_q80_crop-smart.jpg", [x], [error]),
      //invoke('ShareModule', 'share', { title: 'Reanimated Share', message: 'hello from reanimated invoke' }, 'pica boo', {action: x}),
      invoke('Clipboard', 'setString', concat('hello from reanimated invoke ', x)),
    ]),
    [h, q, scroll, dest, translationX, clock, finalScroll, state, scrollX, scrollY, x, error]
  );
  
  useCode(call([state], a => console.log('state', a)), [state])
  //useCode(call([scrollY], a => console.log('scroller', a)), [scrollY])
  
  /*
  return (
    <P
      onHandlerStateChange={event([{ nativeEvent: { translationX } }])}
    >
      <Image source={require('../imageViewer/grid.png')} ref={(r) => setH(findNodeHandle(r))} />
    </P>
  );
  */
  const isInside = useMemo(() => new Value(0));
  useCode(call([isInside], a => console.log('isInside', a)), [isInside])

  //return <AnimatedTimePicker />;

  return <ScrollViewTest />
  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        collapsable={false}
        ref={(r) => setH(findNodeHandle(r))}
        onScroll={onScroll}
        //onHandlerStateChange={onScrollStateChange}
        onGestureEvent={e => console.log(e.nativeEvent)}
        onHandlerStateChange={e => console.log(e.nativeEvent)}
      >
        <View style={{flex:1, minHeight: 200}} />
        <Image source={require('../imageViewer/grid.png')} collapsable={false} ref={(r) => setQ(findNodeHandle(r))} />
      </ScrollView>
      <TapGestureHandler
        onHandlerStateChange={onButtonPress}
      >
        <View style={{ flex: 1, maxHeight: 50, backgroundColor: cond(eq(state, State.ACTIVE), processColor('red'), processColor('white')) }} />
      </TapGestureHandler>
    </>
  );
}