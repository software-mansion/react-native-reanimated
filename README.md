# react-native-reanimated

React Native's Animated library reimplemented.

It provides a more comprehensive, low level abstraction for the Animated library API to be built on top of and hence allow for much greater flexibility especially when it comes to gesture based interactions.

![](/assets/meme.png)

## OMG, why would you build this? (motivation)

Animated library has several limitations that become troubling when it comes to gesture based interactions.
I started this project initially to resolve the issue of pan interaction when the object can be dragged along the screen and when released it should snap to some place on the screen.
The problem there was that even though using `Animated.event` we could map gesture state to the position of the box and make this whole interaction run on UI thread with `useNativeDriver` flag, we still had to call back into JS at the end of the gesture for us to start "snap" animation.
It is because `Animated.spring({}).start()` cannot be used in a "declarative" manner, that is when it gets executed it has a "side effect" of starting a process (an animation) that updates the value for some time.
Adding "side effect" nodes into the current Animated implementation turned out to be a pretty difficult task as the execution model of the Animated API is that it runs all the dependent nodes each frame for the views that needs to update.
We don't want to run "side effects" more often than necessary as it would, for example, result in the animation starting multiple times.

Another reason why I started rethinking how the internals of Animated can be redesigned was my recent work on porting "Animated Tracking" functionality to the native driver.
Apparently even so the native driver is out for quite a while it still does not support all the things non-native Animated lib can do.
Obviously, it is far more difficult to build three versions of each feature (JS, Android and iOS) instead of one, and the same applies for fixing bugs.
One of the goals of reanimated lib was to provide a more generic building block for the API, that would allow for building more complex features only in JS and make the native codebase as minimal as possible.
Let's take "diffClamp" node as an example, it is currently implemented in three different places in Animated core and even though it is pretty useful it actually only has one use case (collapsible scrollview header).

On a similar topic, I come across React Native's PR [#18029](https://github.com/facebook/react-native/pull/18029) and even though it provides a legitimate use case I understand the maintainers being hesitant on merging it. The Animated API shouldn't block people from building things like this and the goal of reanimated API is to provide lower level access that would allow for implementing that and many more features with no necessary changes to the core of the library.

You can watch my [React Europe talk](https://www.youtube.com/watch?v=kdq4z2708VM) where I explain the motivation.

The goals:
 - More generic primitive node types leads to more code reuse for the library internals and hence makes it easier to add new features and fix bugs.
 - The new set of base nodes can be used to implement Animated compatible API including things like:
  - Complex nodes such as “diffClamp”.
  - Interactions such as animated value tracking or animation staggering.
 - Conditional evaluation & nodes with side effects (`set`, `startClock`, `stopClock`).
 - No more “useNativeDriver” – all animations runs on the UI thread by default

## Getting started

Before you get started you should definitely familiarize yourself with the original Animated API first. Refer to the API description below and to the [Examples](#examples) section to learn how to use this library.

Throughout this document when we refer to classes or methods prefixed with `Animated` we usually refer to them being imported from `react-native-reanimated` package instead of plain `react-native`.

### Installation

I. First install the library from npm repository using `yarn`:
```bash
  yarn add react-native-reanimated
```

II. Link native code with `react-native` cli:
```bash
  react-native link react-native-reanimated
```

III. When you want to use "reanimated" in your project import it from `react-native-reanimated` package:
```js
import Animated from 'react-native-reanimated';
```

Similarly when you need `Easing` import it from `react-native-reanimated` package instead of `react-native`:
```js
import Animated, { Easing } from 'react-native-reanimated';
```

## Reanimated vs Animated

We aim to bring this project to be fully compatible with Animated API. We believe that the set of base nodes we have selected should make this possible to be done only by writing JS code and does not require significant changes in the native codebases. Here is a list of things that hasn't yet been ported from the original version of Animated library.
All the functionality that missing elements provide in Animated can be already achieved with reanimated although a different methodology for implementing those may be required (e.g. check ["Running animations" section](#running-animations) to see how the implementation may differ).
 - [ ] using value offsets
 - [ ] value tracking (can be achieved in different way, reanimated also allows for tracking all the animation parameters not only destination params)
 - [ ] animation staggering
 - [ ] animation delays

## Value
`Animated.Value` is a container for storing values. It's is initialized with `new Value(0)` constructor. For backward compatibility there's provided API for setting value after it has been initialized:
```js
const v = new Value(0);
/// ...
v.setValue(100);
```

## Clocks

Original Animated API makes an "animation" object a first class citizen.
Animation object has many features and therefore requires quite a few JS<>Native bridge methods to be managed properly.
In "reanimated" clocks aims to replace that by providing more of a low level abstraction but also since clock nodes behave much the animated values they make the implementation much less complex.

[`Animated.Clock`](#clocks) node is a special type of `Animated.Value` that can be updated in each frame to the timestamp of the current frame. When we take `Clock` node as an input the value it returns is the current frame timestamp in milliseconds. Using special methods clock nodes can be stopped started and we can also test if clock has been started.

Because `Animated.Clock` just extends the `Animated.Value` you can use it in the same places (operations) where you can pass any type of animated node.

## At most once evaluation (the algorithm)

Unlike the original Animated library where each node could have been evaluated many times within a single frame reanimated restricts each node to be evaluated at most once in a frame.
This restriction is required for nodes that have side-effects to be used (e.g. [`set`](#set) or [`startClock`](#startClock)).
When node is evaluated (e.g. in case of an [`add`](#add) node we want to get a sum of the input nodes) its value is cached. If within the next frame there are other nodes that want to use the output of that node instead of evaluating we return cached value.
This notion also helps with performance as we can try to evaluate as few nodes as expected.
The current algorithm for making decisions of which nodes to evaluate works as follows:
 1. Each frame we first analyze the generated events (e.g. touch stream). It is possible that events may update some animated values.
 2. Then we update values that corresponds to [clock](#clocks) nodes that are "running".
 3. We traverse nodes tree starting from the nodes that have been updated in the current cycle and we look for final nodes that are connected to views.
 4. If we found nodes connected to view properties we evaluate them. This can recursively trigger evaluation for their input nodes etc.
 5. After everything is done we check if some "running" clocks exists. If so we enqueue a callback to be evaluated with the next frame and start over from pt 1. Otherwise we do nothing.

## Blocks

Blocks are just an arrays of nodes that are being evaluated in a particular order and return the value of the last node. It can be created using [`block`](#block) command but also when passed as an argument to other nodes the [`block`](#block) command can be omitted and we can just pass a nodes array directly. See an example below:

```js
cond(
  eq(state, State.ACTIVE),
  [
    stopClock(clock),
    set(transX, add(transX, diffX))
  ],
  runTiming(clock, state, config)
)
```

Passing array directly is equivalent to wrapping it with the [`block`](#block) command.

# API reference

## Views, props, etc

Follow the original Animated library guides to learn how values can be connected to View attributes.
Similarly with reanimated you need to use components prefixed with `Animated.` (remember to [import](#getting-started) `Animated` from reanimated package). For example:

```js
import Animated from 'react-native-reanimated';

// use
<Animated.View/>
// instead of
<View/>
```

## Available nodes

<!-- Base  -->

---
### `set`

```js
set(valueToBeUpdated, sourceNode)
```

When evaluated it will assign the value of `sourceNode` to the `Animated.Value` passed as a first argument. In oder word it performs an assignment operation from the `sourceNode` to `valueToBeUpdated` value node.

---
### `cond`

```js
cond(conditionNode, ifNode, [elseNode])
```

If `conditionNode` evaluates to "truthy" value the node evaluates `ifNode` node and returns its value, otherwise it evaluates `elseNode` and returns its value. `elseNode` is optional.

---
### `call`

```js
call(argsNodes, callback)
```

If one of the nodes from `argsNodes` array updates, `callback` method will be run in Javascript provided with a list of current values of nodes from `argsNodes` array as the first argument.

---
### `block`

```js
block([node1, ...])
```

Takes an array of nodes and evaluates all the nodes in the order they are put in the array. Then return the value of the last node.

---
### `debug`

```js
debug(messageString, valueNode)
```

When the node is evaluated it prints to the console (using `console.log` or other means on native) a string that contains the `messageString` concatenated with the value of `valueNode`. Then returns the value of `valueNode`. Note that `messageString` should be a normal string not an animated node.

---
### `startClock`

```js
startClock(clockNode)
```

When evaluated it will make `Clock` node passed as an argument to start updating its value each frame. Then return `0`.

---
### `stopClock`

```js
stopClock(clockNode)
```

When evaluated it will make `Clock` node passed as an argument to stop updating its value if it has been doing that. Then return `0`.

---
### `clockRunning`

```js
clockRunning(clockNode)
```

For a given `Clock` node it returns `1` if the clock is updating each frame (it has been [started](#startClock)) or return `0` otherwise.

---
### `event`

Works the same way as with the original Animated library.

---
### `add`

```js
add(nodeOrNumber1, nodeOrNumber2, ...)
```

Takes two or more animated nodes or values, and when evaluated returns their sum.

---
### `sub`

```js
sub(nodeOrNumber1, nodeOrNumber2, ...)
```

Takes two or more animated nodes or values, and when evaluated returns the result of subtracting their values in the exact order.

---
### `multiply`

```js
multiply(nodeOrNumber1, nodeOrNumber2, ...)
```

Takes two or more animated nodes or values, and when evaluated returns the result of multiplying their values in the exact order.

---
### `divide`

```js
divide(nodeOrNumber1, nodeOrNumber2, ...)
```

Takes two or more animated nodes or values, and when evaluated returns the result of dividing their values in the exact order.


---
### `pow`

```js
pow(nodeOrNumber1, nodeOrNumber2, ...)
```

Takes two or more animated nodes or values, and when evaluated returns the result of first node to the second node power. If more than two nodes are present the result from the previous step is used as a base and the third node as exponent. This process continues onward for the following nodes if these are present.

---
### `modulo`

---
### `sqrt`

---
### `sin`

```js
sin(node)
```

Returns a sine of the value of the given node.

---
### `cos`

```js
cos(node)
```

Returns a cosine of the value of the given node.

---
### `exp`

```js
exp(node)
```

Returns an exponent of the value of the given node.

---
### `round`

```js
round(node)
```

Returns node that rounds input value to the nearest integer.

---
### `floor`

```js
floor(node)
```

Returns node that rounds a number downward to its nearest integer. If the passed argument is an integer, the value will not be rounded.

---
### `ceil`

```js
ceil(node)
```

Returns node that rounds a number upward to its nearest integer. If the passed argument is an integer, the value will not be rounded.

---
### `lessThan`

```js
lessThan(nodeOrValueA, nodeOrValueB)
```

Returns `1` if the value of the first node is less than the value of the second node. Otherwise returns `0`.

---
### `eq`

```js
eq(nodeOrValueA, nodeOrValueB)
```

Returns `1` if the value of both nodes are equal. Otherwise returns `0`.

---
### `greaterThan`


```js
greaterThan(nodeOrValueA, nodeOrValueB)
```

Returns `1` if the value of the first node is greater than the value of the second node. Otherwise returns `0`.

---
### `lessOrEq`

```js
lessOrEq(nodeOrValueA, nodeOrValueB)
```

Returns `1` if the value of the first node is less or equal to the value of the second node. Otherwise returns `0`.

---
### `greaterOrEq`

```js
greaterOrEq(nodeOrValueA, nodeOrValueB)
```

Returns `1` if the value of the first node is greater or equal to the value of the second node. Otherwise returns `0`.

---
### `neq`

```js
neq(nodeOrValueA, nodeOrValueB)
```

Returns `1` if the value of the first node is not equal to the value of the second node. Otherwise returns `0`.

---
### `and`

```js
and(nodeOrValue1, ...)
```

Acts as a logical AND operator. Takes one or more nodes as an input and evaluates them in sequence until some node evaluates to a "falsy" value. Then returns that value and stops evaluating further nodes. If all nodes evaluate to a "truthy" it returns the last node's value.

---
### `or`

```js
or(nodeOrValue1, ...)
```

Acts as a logical OR operator. Takes one or more nodes as an input and evaluates them in sequence until some node evaluates to a "truthy" value. Then returns that value and stops evaluating further nodes. If all nodes evaluate to a "falsy" value it returns the last node's value.

---
### `defined`

```js
defined(node)
```

Returns `1` if the given node evaluates to a "defined" value (that is to something that is non-null, non-undefined and non-NaN). Returns `0` otherwise.

---
### `not`

```js
not(node)
```

Returns `1` if the given node evaluates to a "falsy" value and `0` otherwise.

<!-- Derived -->

---
### `abs`

```js
abs(node)
```

Evaluates the given node and returns an absolute value of the node's value.

---
### `min`

```js
min(nodeOrValue1, ...)
```

Takes one or more nodes as an input and returns a minimum of all the node's values.

---
### `max`

```js
max(nodeOrValue1, ...)
```

Takes one or more nodes as an input and returns a maximum of all the node's values.

---
### `diff`

```js
diff(node)
```

Evaluates node and returns a difference between value returned at the last time it was evaluated and its value at the current time. When evaluating for the first time it returns the node's value.

---
### `acc`

```js
acc(node)
```

Returns an accumulated value of the given node. This node stores a sum of all evaluation of the given node and each time it gets evaluated it would add current node's value to that sum and return it.

---
### `diffClamp`

Works the same way as with the original Animated library.

---
### `interpolate`
```js
interpolate(node, {
  // Input range for the interpolation. Should be monotonically increasing.
  inputRange: [nodeOrValue...],
  // Output range for the interpolation, should be the same length as the input range.
  outputRange: [nodeOrValue...],
  // Sets the left and right extrapolate modes.
  extrapolate?: Extrapolate.EXTEND | Extrapolate.CLAMP | Extrapolate.IDENTITY,
  // Set the left extrapolate mode, the behavior if the input is less than the first value in inputRange.
  extrapolateLeft?: Extrapolate.EXTEND | Extrapolate.CLAMP | Extrapolate.IDENTITY,
  // Set the right extrapolate mode, the behavior if the input is greater than the last value in inputRange.
  extrapolateRight?: Extrapolate.EXTEND | Extrapolate.CLAMP | Extrapolate.IDENTITY,
})

Extrapolate.EXTEND; // Will extend the range linearly.
Extrapolate.CLAMP; // Will clamp the input value to the range.
Extrapolate.IDENTITY; // Will return the input value if the input value is out of range.
```

Maps an input value within a range to an output value within a range. Also supports different types of extrapolation for when the value falls outside the range.

---
### `color`

```js
color(red, green, blue, alpha)
```

Creates a color node in RGBA format. Where first three input nodes should have integer values in range 0-255 and corresponds to color components Red, Green and Blue respectively. Last input node should have value between 0 and 1 and represents alpha channel (value `1` means fully opaque and `0` completely transparent). Alpha parameter can be ommited, then `1` (fully opaque) is used as a default.

The returned node can be mapped to view properties that represents color (e.g. [`backgroundColor`](https://facebook.github.io/react-native/docs/view-style-props.html#backgroundcolor)).

---
### `concat`
```js
concat(nodeOrValue1, ...)
```
Returns concatanation of given nodes (number or string) as string

---
### `onChange`

```js
onChange(value, action)
```
When evaluated, it will compare `value` to its previous value. If it has changed, `action` will be evaluated and its value will be returned.

<!-- Anims -->
## Animations

---
### `decay`

```js
decay(clock, { finished, velocity, position, time }, { deceleration })
```

Updates `position` and `velocity` nodes by running a single step of animation each time this node evaluates. State variable `finished` is set to `1` when the animation gets to the final point (that is the velocity drops under the level of significance). The `time` state node is populated automatically by this node and refers to the last clock time this node got evaluated. It is expected to be reset each time we want to restart the animation. Decay animation can be configured using `deceleration` config param and it controls how fast the animation decelerates. The value should be between `0` and `1` but only values that are close to `1` would yield meaningful results.

---
### `timing`

```js
timing(clock, { finished, position, frameTime, time }, { toValue, duration, easing })
```

Updates `position` node by running timing based animation from a given position to a destination determined by `toValue`. The animation is expected to last `duration` milliseconds and use `easing` function that could be set to one of the nodes exported by the `Easing` object.
The `frameTime` node will also get updated and represents the progress of animation in milliseconds (how long the animation has lasted so far). Similarly to the `time` node that just indicates the last clock time the animation node has been evaluated. Both of these variables are expected to be reset before restarting the animation. Finally `finished` node will be set to `1` when the position reaches the final value or when `frameTime` exceeds `duration`.

---
### `spring`

```js
spring(clock, { finished, position, velocity, time }, { damping, mass, stiffness, overshootClamping, restSpeedThreshold, restDisplacementThreshold, toValue })
```

When evaluated updates `position` and `velocity` nodes by running a single step of spring based animation. Check the original Animated API docs to learn about the config parameters like `damping`, `mass`, `stiffness`, `overshootClamping`, `restSpeedThreshold` and `restDisplacementThreshold`. The `finished` state updates to `1` when the `position` reaches the destination set by `toValue`. The `time` state variable also updates when the node evaluates and it represents the clock value at the time when the node got evaluated for the last time. It is expected that `time` variable is reset before spring animation can be restarted.


## Running animations
### Declarative API
Invoking animation differs a from the way you would do that with the original Animated API.
Here instead of having animation objects we operate on nodes that can perform single animation steps.
In order to map an animation into a value we will make the value to be assigned to a node that among few other things will call into the animation step node. Check [`timing`](#timing), [`decay`](#decay) and [`spring`](#spring) nodes documentation for some details how animation step nodes can be configured.

The example below shows a component that renders:

```js
import Animated, { Easing } from 'react-native-reanimated';

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

  return [
    cond(clockRunning(clock), 0, [
      // If the clock isn't running we reset all the animation params and start the clock
      set(state.finished, 0),
      set(state.time, 0),
      set(state.position, value),
      set(state.frameTime, 0),
      set(config.toValue, dest),
      startClock(clock),
    ]),
    // we run the step here that is going to update position
    timing(clock, state, config),
    // if the animation is over we stop the clock
    cond(state.finished, debug('stop clock', stopClock(clock))),
    // we made the block return the updated position
    state.position,
  ];
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

### Backward compatible API
As it might sometimes impractical to use API above, there's alternative way of invoking animation, which is similar to original Animated API.
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
This API gives possibility to use animation with original Animated API. It's also the the way of running animation on some interaction without necessity or rerendering view.

## 100% declarative gesture interactions

Reanimated works best with the [Gesture Handler](https://kmagiera.github.io/react-native-gesture-handler) library. Currently all the examples are made using that library including the ultimate [ImagePreview app](https://github.com/kmagiera/react-native-reanimated/blob/master/Example/imageViewer). See it in action below:

![](/assets/imagepreview.gif)

## Examples

The source code for the example (showcase) app is under the [`Example/`](https://github.com/kmagiera/react-native-reanimated/blob/master/Example/) directory.

In order to run it you need to pull in the repository, enter `Example/` folder and run:
```bash
  yarn install
```

Then run `react-native run-android` or `react-native run-ios` (depending on which platform you want to run the example app on).

You will need to have an Android or iOS device or emulator connected as well as `react-native-cli` package installed globally.

## License

Gesture handler library is licensed under [The MIT License](LICENSE).

## Credits

This project is supported by amazing people from [Expo.io](https://expo.io) and [Software Mansion](https://swmansion.com)

[![expo](https://avatars2.githubusercontent.com/u/12504344?v=3&s=100 "Expo.io")](https://expo.io)
[![swm](https://avatars1.githubusercontent.com/u/6952717?v=3&s=100 "Software Mansion")](https://swmansion.com)
