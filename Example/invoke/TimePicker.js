import React, { useMemo } from 'react';
import { processColor, ToastAndroid, TimePickerAndroid } from 'react-native';
import { RectButton, State, TapGestureHandler } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { runSpring } from '../test';

const { cond, eq, add, call, set, Value, event, concat, color, modulo, invoke, dispatch, diff, useCode, lessThan, greaterThan, or,Code, map, callback, round,neq, createAnimatedComponent, Text,View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

const Button = createAnimatedComponent(RectButton);

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
  const colorDest = useMemo(() => multiply(animator, 255), [animator]);
  const colorHue = useMemo(() => new Value(0), []);
  const clock = useMemo(() => new Clock(), []);

  useCode(
    block([
      set(colorHue, runSpring(clock, colorHue, 0, colorDest)),
      cond(clockRunning(clock), 0, set(animator, not(animator))),
      invoke('StatusBarManager', 'setColor', color(colorHue, 20, 50, 0.6), 0),
      call([action, hour, minute], a => console.log('time', a))
    ]),
    [colorHue, clock, colorDest, animator, action, hour, minute]
  );
  

  useCode(
    block([
      onChange(state, cond(eq(state, State.ACTIVE), invoke('AppState', 'getCurrentAppState', [{ app_state: appState }], {}))),
      call([appState], a => console.log('appState', a))
    ]),
    [appState, state]
  )

  useCode(
    block([
      invoke('TimePickerAndroid', 'open', { hour: 15, minute: 30, is24Hour: true }, [{ action, hour, minute }]),
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