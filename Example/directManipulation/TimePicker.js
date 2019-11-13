import React, { useMemo, useEffect } from 'react';
import { processColor, ToastAndroid, TimePickerAndroid, StyleSheet, Platform } from 'react-native';
import { RectButton, State, TapGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { Easing } from 'react-native-reanimated';
import { colorHSV } from '../colors';

const { cond, eq, add, call, set, Value, mapBuilder, event, concat, timing, color, modulo, invoke, dispatch, diff, useCode, lessThan, greaterThan, or,Code, map, callback, round,neq, createAnimatedComponent, Text,View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

const Button = createAnimatedComponent(RectButton);
const startStateBuilder = mapBuilder((hour, minute, is24Hour) => map({
  hour,
  minute,
  is24Hour
}))
//const showTimer = proc((startState, callback) => invoke('TimePickerAndroid', 'open', startState, callback))
const showTimer = proc((hour, minute, is24Hour, callback) => invoke('TimePickerAndroid', 'open', startStateBuilder(hour, minute, is24Hour), callback))

function runTiming(clock, value, dest, startStopClock = true) {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    frameTime: new Value(0),
    time: new Value(0),
  };

  const config = {
    toValue: new Value(0),
    duration: 2500,
    easing: Easing.linear,
  };

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.frameTime, 0),
      set(state.time, 0),
      set(state.position, value),
      set(config.toValue, dest),
      startStopClock && startClock(clock),
    ]),
    timing(clock, state, config),
    cond(state.finished, startStopClock && stopClock(clock)),
    state.position,
  ];
}

export default function AnimatedTimePicker() {
  //const ref = React.useRef();
  const action = useMemo(() => new Value(0), []);
  const hour = useMemo(() => new Value(-1), []);
  const minute = useMemo(() => new Value(-1), []);
  const timeRepresentation = useMemo(() => {
    const m = multiply(minute, 0.01);
    return add(hour, m);
  }, [minute]);

  const animState = useMemo(() => new Value(State.UNDETERMINED), []);
  const appState = useMemo(() => new Value("initialAppState"), []);

  const animator = useMemo(() => new Value(1), []);
  const colorHue = useMemo(() => new Value(0), []);
  const clock = useMemo(() => new Clock(), []);
  const color = useMemo(() => colorHSV(colorHue, 0.9, 1), [colorHue]);
  const inputChangeTracker = useMemo(() => or(neq(diff(hour), 0), neq(diff(minute), 0)), [hour, minute]);

  useCode(() =>
    call([animState, animator], a => console.log('state', a)),
    [animState]
  );

  useEffect(() => {
    return () => colorHue.setValue(50)
  })

  useCode(() =>
    block([
      set(colorHue, runTiming(clock, colorHue, multiply(animator, 360))),
      invoke('StatusBarManager', 'setColor', color, 0),
    ]),
    [colorHue, clock, animator, action, hour, minute, animState]
  );

  const hourIn = useMemo(() => new Value(15), []);
  const timerStartingState = useMemo(() => map({
    hour: hourIn,
    minute: 32,
    is24Hour: false
  }), [hourIn]);
  
  useCode(() =>
    onChange(
      animState,
      cond(
        animState,
        [
          showTimer(hourIn, 47, 1, callback({ action, hour, minute })),
          //invoke('TimePickerAndroid', 'open', timerStartingState, callback({ action, hour, minute })),
          invoke('AppState', 'getCurrentAppState', callback({ app_state: appState }), callback({})),
          set(animState, 0),
          //call([appState], a => console.log('appState', a))
        ]
      )
    ),
    [animState, animator, appState, action, hour, minute, inputChangeTracker, timeRepresentation, clock]
  );

  const showToast = useMemo(() => {
    const common = [
      cond(clockRunning(clock), stopClock(clock)),
      set(animator, not(animator))
    ];
    return Platform.select({
      android: [
        ...common,
        invoke('ToastAndroid', 'showWithGravity', concat('selected hour: ', timeRepresentation), 200, 0)
      ],
      default: common
    });
  },
    [clock, animator, timeRepresentation]
  );
  

  useCode(() =>
    block([
      onChange(
        hour,
        showToast
      ),
      onChange(
        minute,
        showToast
      ),
    ]),
    [animator, hour, minute, showToast]
  );
  
  return (
    <View style={[styles.default, { backgroundColor: color}]} collapsable={false}>
      <View style={styles.default} collapsable={false} />
      <RectButton
        onHandlerStateChange={({ nativeEvent: { state } }) => animState.setValue(state === State.ACTIVE)}
        style={[styles.button]}
      >
        <Text style={[styles.button, styles.text]}>Press Me</Text>
      </RectButton>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexWrap: 'wrap',
    flexDirection:'row',
    alignSelf: 'center'
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 48,
    textAlign: 'center',
    textAlignVertical: 'center'
  },
  default: {
    flex: 1
  }
});