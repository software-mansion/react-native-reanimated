import React, { useMemo } from 'react';
import { processColor, ToastAndroid, TimePickerAndroid } from 'react-native';
import { RectButton, State, TapGestureHandler } from 'react-native-gesture-handler';
import Animated, { Easing } from 'react-native-reanimated';
import { runSpring } from '../test';
import { colorHSV } from '../colors';

const { cond, eq, add, call, set, Value, event, concat, timing, color, modulo, invoke, dispatch, diff, useCode, lessThan, greaterThan, or,Code, map, callback, round,neq, createAnimatedComponent, Text,View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

const Button = createAnimatedComponent(RectButton);

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

  const state = useMemo(() => new Value(State.UNDETERMINED), []);
  const appState = useMemo(() => new Value("initialAppState"), []);
  
  const error = useMemo(() => new Value(0), []);

  const onButtonPress = useMemo(() => event([{ nativeEvent: { oldState: state } }]), [state]);

  useCode(
    onChange(
      state,
      cond(
        eq(state, State.ACTIVE),
        [
          set(state, State.UNDETERMINED)
        ]
      )
      
    ),
    [state]
  );

  const animator = useMemo(() => new Value(0), []);
  const colorHue = useMemo(() => new Value(0), []);
  const clock = useMemo(() => new Clock(), []);

  useCode(
    block([
      set(colorHue, runTiming(clock, colorHue, multiply(animator, 360))),
      cond(clockRunning(clock), 0, set(animator, not(animator))),
      invoke('StatusBarManager', 'setColor', colorHSV(colorHue, 1, 1), 0),
      call([action, hour, minute, colorHue], a => console.log('time', a))
    ]),
    [colorHue, clock, animator, action, hour, minute]
  );

  useCode(
    block([
      onChange(state, cond(eq(state, State.ACTIVE), invoke('AppState', 'getCurrentAppState', callback({ app_state: appState }), callback({})))),
      call([appState], a => console.log('appState', a))
    ]),
    [appState, state]
  )

  useCode(
    block([
      invoke('TimePickerAndroid', 'open', { hour: 15, minute: 30, is24Hour: true }, callback({ action, hour, minute })),
      cond(
        and(greaterThan(hour, -1),
          invoke('ToastAndroid', 'showWithGravity', concat('selected hour: ', timeRepresentation), 200, 200)
        )
      ),
      /*
      onChange(action,
        cond(
          eq(add(diff(hour), diff(minute)), 0),
          invoke('ToastAndroid', 'showWithGravity', 'dismissed', 200, 200)
        )
      )
      */
    ]),
    [action, hour, minute]
  );
  /*
  useCode(
    block([
      invoke('ToastAndroid', 'showWithGravity', concat('selected hour: ', add(hour, multiply(minute, 0.01))), 200, 200)
    ]),
    [action, hour, minute]
  );
  */
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ flex: 1 }}>{action}</Text>
      <Text style={{ flex: 1 }}>{hour}</Text>
      <Text style={{ flex: 1 }}>{minute}</Text>
      <TapGestureHandler
        onHandlerStateChange={onButtonPress}
      >

        <View style={{ flex: 1, maxHeight: 50, backgroundColor: cond(eq(state, State.ACTIVE), processColor('red'), processColor('white')) }} />
      </TapGestureHandler>
      <Text style={{ flex: 1, backgroundColor: 'blue' }} children={appState} />
    </View>
  );
}