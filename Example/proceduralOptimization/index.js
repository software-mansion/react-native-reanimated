import React, { Component } from 'react';
import { StyleSheet } from 'react-native';

import Animated, { Easing } from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const {
  set,
  cond,
  multiply,
  startClock,
  stopClock,
  event,
  debug,
  sin,
  add,
  eq,
  cos,
  clockRunning,
  block,
  timing,
  Value,
  Clock,
  proc,
} = Animated;

function runTiming(clock, value, dest, time) {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    time: new Value(0),
    frameTime: new Value(0),
  };

  const config = {
    duration: time,
    toValue: new Value(0),
    easing: Easing.inOut(Easing.ease),
  };

  return block([
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.time, 0),
      set(state.position, value),
      set(state.frameTime, 0),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    timing(clock, state, config),
    cond(state.finished, debug('stop clock', stopClock(clock))),
    state.position,
  ]);
}

export default class Example extends Component {
  static navigationOptions = {
    title: 'Native solar system',
    headerTitleStyle: {
      color: 'white',
    },
    headerStyle: {
      backgroundColor: 'black',
    },
  };
  constructor(props) {
    super(props);
    this.ellipsis = proc((progress, speed, radius, ratio, x, y) =>
      block([
        set(x, multiply(sin(multiply(progress, speed)), radius)),
        set(y, multiply(cos(multiply(progress, speed)), radius, ratio)),
      ])
    );
    this.traversePlanets = planets =>
      planets.map(p => ({
        ...p,
        x: new Value(0),
        y: new Value(0),
        satellites: p.satellites && this.traversePlanets(p.satellites),
      }));

    const offset = new Value(0);
    const drag = new Value(0);

    this.handlePan = event([
      {
        nativeEvent: ({ translationX: x, translationY: y, state }) =>
          block([
            set(drag, add(x, y, offset)),
            cond(eq(state, State.END), [set(offset, add(offset, x, y))]),
          ]),
      },
    ]);
    this.trans = add(
      runTiming(new Clock(), new Value(0), 100, 50000),
      multiply(drag, 0.1)
    );
    this.planets = this.traversePlanets(PLANETS);
  }
  renderPlanets = planets => (
    <React.Fragment>
      {planets.map((p, k) => (
        <React.Fragment key={`planet ${k}`}>
          <Animated.Code
            exec={this.ellipsis(
              this.trans,
              p.speed,
              p.radius,
              p.ratio,
              p.x,
              p.y
            )}
          />
          <Animated.View
            style={[
              styles.box,
              {
                width: p.size,
                backgroundColor: p.color,
                height: p.size,
                borderRadius: p.size,
                transform: [
                  {
                    translateX: p.x,
                  },
                  {
                    translateY: p.y,
                  },
                ],
              },
            ]}>
            {!!p.satellites && this.renderPlanets(p.satellites)}
          </Animated.View>
        </React.Fragment>
      ))}
    </React.Fragment>
  );
  render() {
    return (
      <PanGestureHandler
        onGestureEvent={this.handlePan}
        onHandlerStateChange={this.handlePan}>
        <Animated.View style={styles.container}>
          {this.renderPlanets(this.planets)}
        </Animated.View>
      </PanGestureHandler>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  box: {
    position: 'absolute',
    borderColor: '#F5FCFF',
    backgroundColor: 'plum',
  },
});

const PLANETS = [
  {
    radius: 2,
    size: 20,
    speed: 0.1,
    ratio: 1,
    rotation: '0deg',
    color: '#c7b755',
  },
  {
    radius: 25,
    size: 5,
    speed: 2,
    ratio: 1,
    rotation: '0deg',
    color: '#c74e43',
  },
  {
    radius: 35,
    size: 5,
    speed: 2.2,
    ratio: 1.2,
    rotation: '12deg',
    color: '#4e76c7',
  },
  {
    radius: 45,
    size: 5,
    speed: 1.7,
    ratio: 1.1,
    rotation: '50deg',
    color: '#0ec700',
  },
  {
    radius: 43,
    size: 5,
    speed: 1,
    ratio: 3,
    rotation: '120deg',
    color: '#c76c03',
  },
  {
    radius: 30,
    size: 12,
    speed: 0.6,
    ratio: 1.4,
    rotation: '40deg',
    color: '#c741a4',
  },
  {
    radius: 200,
    size: 12,
    speed: 1.3,
    ratio: 0.2,
    rotation: '120deg',
    color: '#c73621',
  },
  {
    radius: 50,
    size: 32,
    speed: 1.2,
    ratio: 2,
    rotation: '120deg',
    color: '#c78213',
    satellites: [
      {
        radius: 22,
        size: 8,
        speed: 1,
        ratio: 1.3,
        rotation: '15deg',
        color: '#c70035',
      },
      {
        radius: 35,
        size: 12,
        speed: 1.4,
        ratio: 0.8,
        rotation: '112deg',
        color: '#c6c79b',
      },
    ],
  },
  {
    radius: 100,
    size: 42,
    speed: 1,
    ratio: 1.1,
    rotation: '40deg',
    color: '#c7b342',
  },
  {
    radius: 200,
    size: 82,
    speed: 1.5,
    ratio: 1.1,
    rotation: '120deg',
    color: '#001ac7',
    satellites: [
      {
        radius: 42,
        size: 20,
        speed: 1,
        ratio: 1,
        rotation: '0deg',
        color: '#c7c7e5',
      },
      {
        radius: 35,
        size: 12,
        speed: 1.4,
        ratio: 0.8,
        rotation: '152deg',
        color: '#c6c79b',
      },
      {
        radius: 42,
        size: 8,
        speed: 1.1,
        ratio: 1.3,
        rotation: '55deg',
        color: '#c7be6f',
      },
      {
        radius: 35,
        size: 15,
        speed: 1.8,
        ratio: 0.8,
        rotation: '132deg',
        color: '#73304a',
      },
      {
        radius: 42,
        size: 4,
        speed: 1,
        ratio: 1,
        rotation: '0deg',
        color: '#dbdbff',
      },
      {
        radius: 35,
        size: 3,
        speed: 1.4,
        ratio: 0.8,
        rotation: '152deg',
        color: '#c6c79b',
      },
      {
        radius: 42,
        size: 7,
        speed: 1.1,
        ratio: 1.3,
        rotation: '55deg',
        color: '#c7be6f',
        satellites: [
          {
            radius: 40,
            size: 8,
            speed: 1,
            ratio: 1,
            rotation: '0deg',
            color: '#c70035',
          },
          {
            radius: 50,
            size: 12,
            speed: 2,
            ratio: 1,
            rotation: '0deg',
            color: '#c6c79b',
          },
        ],
      },
      {
        radius: 35,
        size: 5,
        speed: 1.8,
        ratio: 0.8,
        rotation: '132deg',
        color: '#5b730d',
      },
    ],
  },
];
