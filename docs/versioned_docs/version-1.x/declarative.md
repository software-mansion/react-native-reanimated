---
id: declarative
title: Declarative Animation API
sidebar_label: Declarative Animation API
---

Invoking animation differs from the way it is done when using the original `Animated` API.
Here, instead of having animation objects we operate on nodes that can perform single animation steps.
In order to map an animation into a value, we will make the value to be assigned to a node that among few other things will call into the animation step node. Check [`timing`](animations/timing.md), [`decay`](animations/decay.md) and [`spring`](animations/spring.md) nodes documentation for some details about how animation step nodes can be configured.

The example below shows a component that renders:

```js
import Animated, { Easing } from 'react-native-reanimated';

const {
  Clock,
  Value,
  set,
  cond,
  startClock,
  clockRunning,
  timing,
  debug,
  stopClock,
  block,
} = Animated;

function runTiming(clock, value, dest) {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    time: new Value(0),
    frameTime: new Value(0),
  };

  const config = {
    duration: 5000,
    toValue: new Value(0),
    easing: Easing.inOut(Easing.ease),
  };

  return block([
    cond(
      clockRunning(clock),
      [
        // if the clock is already running we update the toValue, in case a new dest has been passed in
        set(config.toValue, dest),
      ],
      [
        // if the clock isn't running we reset all the animation params and start the clock
        set(state.finished, 0),
        set(state.time, 0),
        set(state.position, value),
        set(state.frameTime, 0),
        set(config.toValue, dest),
        startClock(clock),
      ]
    ),
    // we run the step here that is going to update position
    timing(clock, state, config),
    // if the animation is over we stop the clock
    cond(state.finished, debug('stop clock', stopClock(clock))),
    // we made the block return the updated position
    state.position,
  ]);
}

export class AnimatedBox extends Component {
  // we create a clock node
  clock = new Clock();
  // and use runTiming method defined above to create a node that is going to be mapped
  // to the translateX transform.
  transX = runTiming(this.clock, -120, 120);

  render() {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[styles.box, { transform: [{ translateX: this.transX }] }]}
        />
      </View>
    );
  }
}
```

## Backward compatible API

As it might sometimes be impractical to use the API above, there's an alternative way of invoking animation, which is similar to the original `Animated` API.

```js
class Example extends Component {
  constructor(props) {
    super(props);
    this._transX = new Value(0);
    this._config = {
      duration: 5000,
      toValue: 120,
      easing: Easing.inOut(Easing.ease),
    };
    this._anim = timing(this._transX, this._config);
  }

  render() {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[styles.box, { transform: [{ translateX: this._transX }] }]}
        />
        <Button
          onPress={() => {
            this._anim.start();
          }}
          title="Start"
        />
      </View>
    );
  }
}
```

This API gives the possibility to use animation with original `Animated` API. It's also a way of running animation on some interaction without necessity or rerendering view.
