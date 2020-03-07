import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { RectButton, State } from 'react-native-gesture-handler';
import Animated, { Easing } from 'react-native-reanimated';
import { colorHSV } from '../colors';

const { cond, eq, add, call, set, Value, debug, concat, timing, color, modulo, invoke, dispatch, diff, useCode, lessThan, greaterThan, or, Code, map, callback, round, neq, createAnimatedComponent, Text, View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

const Button = createAnimatedComponent(RectButton);

// const showTimer = proc((startState, callback) => invoke('TimePickerAndroid', 'open', startState, callback))
const timerSuccessMap = proc((action, hour, minute) => map([{ action, hour, minute }]));

const timeInitialized = proc((hour, minute) => not(or(eq(hour, -1), eq(minute, -1))));

const showTimer = proc((hour, minute, is24Hour, pickerAction) => {
  const startState = cond(
    timeInitialized(hour, minute),
    map({
      hour,
      minute,
      is24Hour
    }),
    map()
  );

  const cb = callback({
    hour,
    minute,
    action: pickerAction
  });

  return invoke('TimePickerAndroid', 'open', startState, cb);
})


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
  const action = useMemo(() => new Value(0), []);
  const hour = useMemo(() => new Value(-1), []);
  const minute = useMemo(() => new Value(-1), []);
  const timeRepresentation = useMemo(() => {
    const m = multiply(minute, 0.01);
    return add(hour, m);
  }, [minute, hour]);

  const animState = useMemo(() => new Value(State.UNDETERMINED), []);
  const appState = useMemo(() => new Value("initialAppState"), []);

  const animator = useMemo(() => new Value(0), []);
  const colorHue = useMemo(() => new Value(0), []);
  const clock = useMemo(() => new Clock(), []);
  const color = useMemo(() => colorHSV(colorHue, 0.9, 1), [colorHue]);
  const inputChangeTracker = useMemo(() => or(neq(diff(hour), 0), neq(diff(minute), 0)), [hour, minute]);
  const appStateCallback = useMemo(() => callback({ app_state: appState }), [appState]);

  useEffect(() => {
    return () => colorHue.setValue(50);
  }, []);

  useCode(() =>
    block([
      set(colorHue, runTiming(clock, colorHue, multiply(animator, 360))),
      invoke('StatusBarManager', 'setColor', color, 0),
    ]),
    [colorHue, clock, animator, action, hour, minute, animState]
  );

  useCode(() =>
    onChange(
      animState,
      cond(
        animState,
        [
          showTimer(hour, minute, 1, action),
          invoke('AppState', 'getCurrentAppState', debug('app state', appStateCallback), debug('stub', callback())),
          set(animState, 0),
        ]
      )
    ),
    [animState, animator, appState, action, hour, minute, inputChangeTracker, timeRepresentation, clock, appStateCallback]
  );

  useCode(() =>
    call([hour, minute, appStateCallback], ([hour, minute, appStateMap]) => console.log(`user picked following time: `, { hour, minute }, appStateMap)),
    [hour, minute, appStateCallback]
  );

  const showToast = useMemo(() => {
    const common = [
      cond(clockRunning(clock), stopClock(clock)),
      set(animator, not(animator))
    ];
    return Platform.select({
      android: [
        ...common,
        cond(
          timeInitialized(hour, minute),
          invoke('ToastAndroid', 'showWithGravity', concat('selected hour: ', timeRepresentation), 200, 0)
        )
      ],
      default: common
    });
  },
    [clock, animator, timeRepresentation, hour, minute]
  );


  useCode(() =>
    block([
      onChange(
        timeRepresentation,
        showToast
      )
    ]),
    [animator, showToast, timeRepresentation]
  );

  return (
    <View style={[styles.default, { backgroundColor: color }]} collapsable={false}>
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
    flexDirection: 'row',
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