import React, { useMemo, useRef, useState } from 'react';
import { findNodeHandle, Image, StyleSheet, UIManager, processColor } from 'react-native';
import { PanGestureHandler, State, RectButton } from 'react-native-gesture-handler';
import Animated, { Easing } from 'react-native-reanimated';

const { interpolate, cond, eq, timing, add, call, max, set, Text, Value, event, decay, concat, divide, abs, sub, color, invoke, dispatch, useCode, or, Code, map, callback, neq, createAnimatedComponent, View, ScrollView, and, proc, Clock, multiply, onChange, not, defined, clockRunning, block, startClock, stopClock, spring } = Animated;

const decelerationRate = 0.9955;

const Button = createAnimatedComponent(RectButton);



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

const scrollTo = proc((tag, scrollX, scrollY, animated) => cond(neq(tag, -1), dispatch(resolveScrollViewNS(), 'scrollTo', tag, scrollX, scrollY, animated)));
const scrollBy = proc((tag, scrollX, scrollY, scrollByX, scrollByY, animated) => scrollTo(tag, add(scrollX, scrollByX), add(scrollY, scrollByY), animated))
const cb = proc((x) => callback({ x }));
const sign = proc((x) => divide(x, abs(x)));
const decayVelocity = proc((v) => cond(eq(v, 0), 1, multiply(v, -1)));
const scrollEvent = proc((x, y) => event([{ nativeEvent: { contentOffset: { x, y } } }]));

function ControlledScrollView(props, ref) {
  const [handle, setHandle] = useState(-1);

  const scrollX = useMemo(() => new Value(0), []);
  const scrollY = useMemo(() => new Value(0), []);
  const scrollXBegin = useMemo(() => new Value(0), []);
  const scrollYBegin = useMemo(() => new Value(0), []);
  const clockX = useMemo(() => new Clock(), []);
  const clockY = useMemo(() => new Clock(), []);

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

  const onScroll1 = useMemo(() =>
    event([{
      nativeEvent: {
        contentOffset: ({ x, y }) => cond(
          neq(panOldState, State.ACTIVE),
          [
            set(scrollX, x),
            set(scrollY, y),
          ]
        )

      }
    }]),
    [panOldState, scrollX, scrollY]
  );

  useCode(() =>
    cond(
      eq(panOldState, State.ACTIVE),
      [
        clockX,
        clockY,
        set(finalScrollX, 0),
        //set(finalScrollX, runDecay(clockX, scrollX, props.horizontal && Platform.OS === 'android' ? decayVelocity(velocityX) : Platform.OS !== 'android' ? decayVelocity(velocityX):0)),
        set(finalScrollY, runDecay(clockY, scrollY, decayVelocity(velocityY))),
        set(translationX, 0),
        set(translationY, 0),
        scrollTo(handle, max(finalScrollX, 0), max(finalScrollY, 0), 0),
        set(scrollXBegin, finalScrollX),
        set(scrollYBegin, finalScrollY),
        //call([scrollX, scrollY, finalScrollX, finalScrollY], e => console.log('scroll', e)),
      ],
      [
        cond(clockRunning(clockX), stopClock(clockX)),
        cond(clockRunning(clockY), stopClock(clockY)),
        scrollBy(handle, scrollXBegin, scrollYBegin, multiply(translationX, -1), multiply(translationY, -1), 1)
      ]
    ),
    [handle, panOldState, translationX, translationY, finalScrollX, finalScrollY, scrollX, scrollY, clockX, clockY, velocityX, velocityY]
  );

  return (
    <PanGestureHandler
      onGestureEvent={onPan}
      onHandlerStateChange={onPan}
      {...props}
      ref={ref}
    >
      <ScrollView
        style={styles.scrollView}
        collapsable={false}
        ref={(r) => setHandle(findNodeHandle(r))}
        onScroll={onScroll}
        scrollEnabled={false}
        decelerationRate={decelerationRate}
      >
        <Image source={require('../imageViewer/grid.png')} collapsable={false} />
      </ScrollView>
    </PanGestureHandler>
  );
}

ControlledScrollView = React.forwardRef(ControlledScrollView);

export default function ScrollViewMock(props) {
  const [i, forceRefresh] = useState(0);
  const vibrate = useMemo(() => new Value(0), []);
  const correct = useMemo(() => new Value(0), []);

  useCode(() =>
    cond(
      vibrate,
      [
        invoke('Vibration', 'vibrate', 500),
        set(vibrate, 0),
        //set(correct, 1)
      ]
    ),
    [vibrate]
  );
  /*
  useCode(() =>
    onChange(
      panState,
      cond(
        eq(panState, State.BEGAN),
        [
          set(correct, 0)
        ]
      )
    ),
    [panState, correct]
  );
  */
  const refA = useRef();
  const refB = useRef();
  const refC = useRef();

  const vibrateEvent = useMemo(() =>
    event([{
      nativeEvent: ({ state }) =>
        set(vibrate, eq(state, State.ACTIVE))
    }]),
    [vibrate]
  );

  const baseScrollComponent = (
    <RectButton
      key="______ScrollView1"
      style={styles.default}
      ref={refA}
      onHandlerStateChange={(e) => e.nativeEvent.state === State.ACTIVE && vibrate.setValue(1)}
    >
      <View style={styles.default} collapsable={false}>
        <ScrollView
          style={styles.scrollView}
          collapsable={false}
          //decelerationRate={decelerationRate}
          waitFor={refA}
        >
          <Image source={require('../imageViewer/grid.png')} collapsable={false} />
        </ScrollView>
      </View>
    </RectButton>
  );

  const animatedScrollComponent = (
    <RectButton
      key="______ScrollView2"
      style={styles.default}
      onHandlerStateChange={(e) => {
        e.nativeEvent.state === State.BEGAN && correct.setValue(0);
        e.nativeEvent.state === State.ACTIVE && correct.setValue(1);
      }}
      ref={refB}
      waitFor={refC}
    >
      <View style={styles.default} collapsable={false}>
        <ControlledScrollView ref={refC} />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: cond(correct, processColor('red'), processColor('transparent')),
              opacity: cond(correct, 0.5, 0),
            }
          ]}
        >
          <Text style={styles.text}>I'm the controlled one</Text>
        </View>
      </View>
    </RectButton>
  );

  const randomizer = useMemo(() => Math.round(Math.random() * 10) % 2 === 0, [i]);

  return (
    <View style={styles.default}>
      <Text>One ScrollView is a regular one, the other is actually controlled by a PanGestureHandler utilizing dispatch.</Text>
      <Text>Tap on the one you think is the real one</Text>
      {randomizer ? baseScrollComponent : animatedScrollComponent}
      {randomizer ? animatedScrollComponent : baseScrollComponent}
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
    flex: 1
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    alignSelf: 'center',
    color: 'black',
    backgroundColor: 'white'
  }
})