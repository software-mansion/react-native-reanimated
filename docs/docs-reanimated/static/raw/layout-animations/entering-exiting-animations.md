# Entering/Exiting animations

Entering/Exiting animations let you animate elements when they are added to or removed from the view hierarchy.

Reanimated comes with a bunch of predefined animations you can customize. For more advanced use-cases, you can use [Keyframes](/docs/layout-animations/keyframe-animations) or create your own [custom entering/exiting animations](/docs/layout-animations/custom-animations).

> **Info**
>
> Spring-based animations are yet to be introduced to the web. Due to that, playground doesn't cover `springify()` options but they can be applied to your animations on iOS and Android platforms.

## Remarks

* We recommend using layout animation builders outside of components or with `useMemo` to ensure the best performance.
* On the New Architecture:
  * `nativeID` is used internally to configure entering animations, so overwriting it will result in entering animations not running. Some components (e.g. TouchableWithoutFeedback) overwrite `nativeID` of its children. To work around this issue wrap your animated children with a `View`.
  * removing a non-animated view will trigger exiting animations in its children, but the non-animated view will not wait for the children's animations to finish. This is due to view flattening and can be mitigated by using `collapsable={false}`.

## Fade

`FadeX` lets you create a fading animation.

```jsx
import { FadeIn, FadeOut } from 'react-native-reanimated';

function App() {
  return <Animated.View entering={FadeIn} exiting={FadeOut} />;
}
```

Available fade animations:

### Entering

* `FadeIn`

* `FadeInRight`

* `FadeInLeft`

* `FadeInUp`

* `FadeInDown`

### Exiting

* `FadeOut`

* `FadeOutRight`

* `FadeOutLeft`

* `FadeOutUp`

* `FadeOutDown`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name           | Config                                           |
| -------------- | ------------------------------------------------ |
| `FadeIn`       | `{opacity: 0}`                                   |
| `FadeInDown`   | `{opacity: 0, transform: [{ translateY: 25 }]}`  |
| `FadeInLeft`   | `{opacity: 0, transform: [{ translateX: -25 }]}` |
| `FadeInRight`  | `{opacity: 0, transform: [{ translateX: 25 }]}`  |
| `FadeInUp`     | `{opacity: 0, transform: [{ translateY: -25 }]}` |
| `FadeOut`      | `{opacity: 1}`                                   |
| `FadeOutDown`  | `{opacity: 1, transform: [{ translateY: 0 }]}`   |
| `FadeOutLeft`  | `{opacity: 1, transform: [{ translateX: 0 }]}`   |
| `FadeOutRight` | `{opacity: 1, transform: [{ translateX: 0 }]}`   |
| `FadeOutUp`    | `{opacity: 1, transform: [{ translateY: 0 }]}`   |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
FadeOutLeft.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
FadeInUp.springify()
  .damping(30)
  .mass(5)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
FadeInDown.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({ transform: [{ translateY: 420 }] })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Bounce

`BounceX` lets you create a bouncing animation.

```jsx
import { BounceIn, BounceOut } from 'react-native-reanimated';

function App() {
  return <Animated.View entering={BounceIn} exiting={BounceOut} />;
}
```

Available bounce animations:

### Entering

* `BounceIn`

* `BounceInRight`

* `BounceInLeft`

* `BounceInUp`

* `BounceInDown`

### Exiting

* `BounceOut`

* `BounceOutRight`

* `BounceOutLeft`

* `BounceOutUp`

* `BounceOutDown`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name             | Config                                                |
| ---------------- | ----------------------------------------------------- |
| `BounceIn`       | `{transform: [{ scale: 0 }]}`                         |
| `BounceInRight`  | `{transform: [{ translateX: values.windowWidth }]}`   |
| `BounceInLeft`   | `{transform: [{ translateX: -values.windowWidth }]}`  |
| `BounceInUp`     | `{transform: [{ translateY: -values.windowHeight }]}` |
| `BounceInDown`   | `{transform: [{ translateY: values.windowHeight}]}`   |
| `BounceOut`      | `{transform: [{ scale: 1 }]}`                         |
| `BounceOutRight` | `{transform: [{ translateX: 0 }]}`                    |
| `BounceOutLeft`  | `{transform: [{ translateX: 0 }]}`                    |
| `BounceOutUp`    | `{transform: [{ translateY: 0 }]}`                    |
| `BounceOutDown`  | `{transform: [{ translateY: 0 }]}`                    |

### Modifiers&#x20;

```javascript
BounceInDown.duration(500)
  .delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({ transform: [{ translateY: -420 }] })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `600`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Flip

`FlipX` lets you create animation based on rotation over specific axis.

```jsx
import { FlipInEasyX, FlipOutEasyX } from 'react-native-reanimated';

function App() {
  return <Animated.View entering={FlipInEasyX} exiting={FlipOutEasyX} />;
}
```

Available flip animations:

### Entering

* `FlipInEasyX`

* `FlipInEasyY`

* `FlipInXDown`

* `FlipInXUp`

* `FlipInYLeft`

* `FlipInYRight`

### Exiting

* `FlipOutEasyX`

* `FlipOutEasyY`

* `FlipOutXDown`

* `FlipOutXUp`

* `FlipOutYLeft`

* `FlipOutYRight`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name            | Config                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `FlipInEasyX`   | `{transform: [{ perspective: 500 }, { rotateX: '90deg' }]}`                                              |
| `FlipInEasyY`   | `{transform: [{ perspective: 500 }, { rotateY: '90deg' }]}`                                              |
| `FlipInXDown`   | `{transform: [{ perspective: 500 }, { rotateX: '-90deg' }, { translateY: targetValues.targetHeight }]}`  |
| `FlipInXUp`     | `{transform: [{ perspective: 500 }, { rotateX: '90deg' }, { translateY: -targetValues.targetHeight }]}`  |
| `FlipInYLeft`   | `{transform: [{ perspective: 500 }, { rotateY: '-90deg' }, { translateX: -targetValues.targetWidth } ]}` |
| `FlipInYRight`  | `{transform: [{ perspective: 500 }, { rotateY: '90deg' }, { translateX: targetValues.targetWidth } ]}`   |
| `FlipOutEasyX`  | `{transform: [{ perspective: 500 }, { rotateX: '0deg' }]}`                                               |
| `FlipOutEasyY`  | `{transform: [{ perspective: 500 }, { rotateY: '0deg' }]}`                                               |
| `FlipOutXDown`  | `{transform: [{ perspective: 500 }, { rotateX: '0deg' }, { translateY: 0 }]}`                            |
| `FlipOutXUp`    | `{transform: [{ perspective: 500 }, { rotateX: '0deg' }, { translateY: 0 }]}`                            |
| `FlipOutYLeft`  | `{transform: [{ perspective: 500 }, { rotateY: '0deg' }, { translateX: 0 }]}`                            |
| `FlipOutYRight` | `{transform: [{ perspective: 500 }, { rotateY: '0deg' }, { translateX: 0 }]}`                            |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
FlipOutYLeft.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
FlipInXUp.springify()
  .damping(2)
  .mass(3)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
FlipInEasyY.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({
    transform: [{ perspective: 100 }, { rotateY: '123deg' }],
  })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## LightSpeed

`LightSpeedX` lets you create an animation of a horizontally moving object with a change of opacity and skew.

```jsx
import { LightSpeedInRight, LightSpeedOutLeft } from 'react-native-reanimated';

function App() {
  return (
    <Animated.View entering={LightSpeedInRight} exiting={LightSpeedOutLeft} />
  );
}
```

Available lightspeed animations:

### Entering

* `LightSpeedInRight`

* `LightSpeedInLeft`

### Exiting

* `LightSpeedOutRight`

* `LightSpeedOutLeft`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name                 | Config                                                                               |
| -------------------- | ------------------------------------------------------------------------------------ |
| `LightSpeedInLeft`   | `{opacity: 0, transform: [{ translateX: -values.windowWidth }, { skewX: '45deg' }]}` |
| `LightSpeedInRight`  | `{opacity: 0, transform: [{ translateX: values.windowWidth }, { skewX: '-45deg' }]}` |
| `LightSpeedOutLeft`  | `{opacity: 1, transform: [{ translateX: 0 }, { skewX: '0deg' }]}`                    |
| `LightSpeedOutRight` | `{opacity: 1, transform: [{ translateX: 0 }, { skewX: '0deg' }]}`                    |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
LightSpeedOutLeft.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
LightSpeedInLeft.springify()
  .damping(30)
  .mass(5)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
LightSpeedInRight.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({
    transform: [{ translateX: -100 }, { skewX: '-10deg' }],
  })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Pinwheel

`PinwheelX` lets you create an animation based on rotation, scale, and opacity.

```jsx
import { PinwheelIn, PinwheelOut } from 'react-native-reanimated';

function App() {
  return <Animated.View entering={PinwheelIn} exiting={PinwheelOut} />;
}
```

Available pinwheel animations:

### Entering

* `PinwheelIn`

### Exiting

* `PinwheelOut`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name          | Config                                                   |
| ------------- | -------------------------------------------------------- |
| `PinwheelIn`  | `{opacity: 0, transform: [{ scale: 0 }, {rotate: '5'}]}` |
| `PinwheelOut` | `{opacity: 1, transform: [{ scale: 1 }, {rotate: '0'}]}` |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
PinwheelOut.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
PinwheelIn.springify()
  .damping(2)
  .mass(5)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
PinwheelIn.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({
    transform: [{ scale: 0.8 }, { rotate: '3' }],
  })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Roll

`RollX` lets you create an animation of a horizontally moving object with a rotation.

```jsx
import { RollInRight, RollOutLeft } from 'react-native-reanimated';

function App() {
  return <Animated.View entering={RollInRight} exiting={RollOutLeft} />;
}
```

Available roll animations:

### Entering

* `RollInRight`

* `RollInLeft`

### Exiting

* `RollOutRight`

* `RollOutLeft`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name           | Config                                                                      |
| -------------- | --------------------------------------------------------------------------- |
| `RollInLeft`   | `{transform: [{ translateX: -values.windowWidth }, { rotate: '-180deg' }]}` |
| `RollInRight`  | `{transform: [{ translateX: values.windowWidth }, { rotate: '180deg' }]}`   |
| `RollOutLeft`  | `{transform: [{ translateX: 0 }, { rotate: '0deg' }]}`                      |
| `RollOutRight` | `{transform: [{ translateX: 0 }, { rotate: '0deg' }]}`                      |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
RollOutLeft.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
RollInLeft.springify()
  .damping(30)
  .mass(5)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
RollInRight.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({ transform: [{ translateX: 100 }, { rotate: '-45deg' }] })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Rotate

`RotateX` lets you create a rotation animation.

```jsx
import { RotateInDownLeft, RotateOutDownLeft } from 'react-native-reanimated';

function App() {
  return (
    <Animated.View entering={RotateInDownLeft} exiting={RotateOutDownLeft} />
  );
}
```

Available rotate animations:

### Entering

* `RotateInDownLeft`

* `RotateInDownRight`

* `RotateInUpLeft`

* `RotateInUpRight`

### Exiting

* `RotateOutDownLeft`

* `RotateOutDownRight`

* `RotateOutUpLeft`

* `RotateOutUpRight`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name                 | Config                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RotateInDownLeft`   | `{opacity: 0, transform: [{ rotate: '-90deg' }, { translateX: values.targetWidth / 2 - values.targetHeight / 2 }, { translateY: -(values.targetWidth / 2 - values.targetHeight / 2) }]}`   |
| `RotateInDownRight`  | `{opacity: 0, transform: [{ rotate: '90deg' }, { translateX: -(values.targetWidth / 2 - values.targetHeight / 2) }, { translateY: -(values.targetWidth / 2 - values.targetHeight / 2) }]}` |
| `RotateInUpLeft`     | `{opacity: 0, transform: [{ rotate: '90deg' }, { translateX: values.targetWidth / 2 - values.targetHeight / 2 }, { translateY: values.targetWidth / 2 - values.targetHeight / 2 }]}`       |
| `RotateInUpRight`    | `{opacity: 0, transform: [{ rotate: '-90deg' }, { translateX: -(values.targetWidth / 2 - values.targetHeight / 2) }, { translateY: values.targetWidth / 2 - values.targetHeight / 2 }]}`   |
| `RotateOutDownLeft`  | `{opacity: 1, transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }]}`                                                                                                      |
| `RotateOutDownRight` | `{opacity: 1, transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }]}`                                                                                                      |
| `RotateOutUpLeft`    | `{opacity: 1, transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }]}`                                                                                                      |
| `RotateOutUpRight`   | `{opacity: 1, transform: [{ rotate: '0deg' }, { translateX: 0 }, { translateY: 0 }]}`                                                                                                      |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
RotateOutDownRight.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
RotateInUpLeft.springify()
  .damping(30)
  .mass(5)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
RotateInDownLeft.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({
    transform: [{ rotate: '-90deg' }, { translateX: 100 }, { translateY: 100 }],
  })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Slide

`SlideX` lets you create an animation of horizontal or vertical moving object.

```jsx
import { SlideInRight, SlideOutLeft } from 'react-native-reanimated';

function App() {
  return <Animated.View entering={SlideInRight} exiting={SlideOutLeft} />;
}
```

Available slide animations:

### Entering

* `SlideInRight`

* `SlideInLeft`

* `SlideInUp`

* `SlideInDown`

### Exiting

* `SlideOutRight`

* `SlideOutLeft`

* `SlideOutUp`

* `SlideOutDown`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name            | Config                                                  |
| --------------- | ------------------------------------------------------- |
| `SlideInDown`   | `{originY: values.targetOriginY + values.windowHeight}` |
| `SlideInLeft`   | `{originX: values.targetOriginX - values.windowWidth}`  |
| `SlideInRight`  | `{originX: values.targetOriginX + values.windowWidth}`  |
| `SlideInUp`     | `{originY: -values.windowHeight}`                       |
| `SlideOutDown`  | `{originY: values.currentOriginY}`                      |
| `SlideOutLeft`  | `{originX: values.currentOriginX}`                      |
| `SlideOutRight` | `{originX: values.currentOriginX}`                      |
| `SlideOutUp`    | `{originY: values.currentOriginY}`                      |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
SlideOutLeft.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
SlideInUp.springify()
  .damping(30)
  .mass(5)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
SlideInDown.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({ transform: [{ translateY: 420 }] })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Stretch

`StretchX` lets you create an animation based on scaling in X or Y axis.

```jsx
import { StretchInX, StretchOutY } from 'react-native-reanimated';

function App() {
  return <Animated.View entering={StretchInX} exiting={StretchOutY} />;
}
```

Available stretch animations:

### Entering

* `StretchInX`

* `StretchInY`

### Exiting

* `StretchOutX`

* `StretchOutY`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name          | Config                         |
| ------------- | ------------------------------ |
| `StretchInX`  | `{transform: [{ scaleX: 0 }]}` |
| `StretchInY`  | `{transform: [{ scaleY: 0 }]}` |
| `StretchOutX` | `{transform: [{ scaleX: 1 }]}` |
| `StretchOutY` | `{transform: [{ scaleY: 1 }]}` |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
StretchOutX.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
StretchInX.springify()
  .damping(30)
  .mass(5)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
StretchInY.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({ transform: [{ scaleY: 0.5 }] })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Zoom

`ZoomX` lets you create an animation based on scale.

```jsx
import { ZoomIn, ZoomOut } from 'react-native-reanimated';

function App() {
  return <Animated.View entering={ZoomIn} exiting={ZoomOut} />;
}
```

Available zoom animations:

### Entering

* `ZoomIn`

* `ZoomInDown`

* `ZoomInEasyDown`

* `ZoomInEasyUp`

* `ZoomInLeft`

* `ZoomInRight`

* `ZoomInRotate`

* `ZoomInUp`

### Exiting

* `ZoomOut`

* `ZoomOutDown`

* `ZoomOutEasyDown`

* `ZoomOutEasyUp`

* `ZoomOutLeft`

* `ZoomOutRight`

* `ZoomOutRotate`

* `ZoomOutUp`

Initial values

These are the initial values for each animation that can be customized with the `withInitialValues` modifier.

| Name              | Config                                                              |
| ----------------- | ------------------------------------------------------------------- |
| `ZoomIn`          | `{transform: [{ scale: 0 }]}`                                       |
| `ZoomInDown`      | `{transform: [{ translateY: values.windowHeight }, { scale: 0 }]}`  |
| `ZoomInEasyDown`  | `{transform: [{ translateY: values.targetHeight }, { scale: 0 }]}`  |
| `ZoomInEasyUp`    | `{transform: [{ translateY: -values.targetHeight }, { scale: 0 }]}` |
| `ZoomInLeft`      | `{transform: [{ translateX: -values.windowWidth }, { scale: 0 }]}`  |
| `ZoomInRight`     | `{transform: [{ translateX: values.windowWidth }, { scale: 0 }]}`   |
| `ZoomInRotate`    | `{transform: [{ scale: 0 }, { rotate: rotate }]}`                   |
| `ZoomInUp`        | `{transform: [{ translateY: -values.windowHeight }, { scale: 0 }]}` |
| `ZoomOut`         | `{transform: [{ scale: 1 }]}`                                       |
| `ZoomOutDown`     | `{transform: [{ translateY: 0 }, { scale: 1 }]}`                    |
| `ZoomOutEasyDown` | `{transform: [{ translateY: 0 }, { scale: 1 }]}`                    |
| `ZoomOutEasyUp`   | `{transform: [{ translateY: 0 }, { scale: 1 }]}`                    |
| `ZoomOutLeft`     | `{transform: [{ translateX: 0 }, { scale: 1 }]}`                    |
| `ZoomOutRight`    | `{transform: [{ translateX: 0 }, { scale: 1 }]}`                    |
| `ZoomOutRotate`   | `{transform: [{ scale: 1 }, { rotate: '0' }]}`                      |
| `ZoomOutUp`       | `{transform: [{ translateY: 0 }, { scale: 1 }]}`                    |

### Modifiers

#### Time-based&#x20;

Time-based modifiers rely on [`withTiming`](/docs/animations/withTiming) function.

```javascript
ZoomOutLeft.duration(500).easing(Easing.ease);
```

* `.easing(easingFunction: EasingFunction)` is an easing function which defines the animation curve. Defaults to `Easing.inOut(Easing.quad)`

> **Note**
>
> Time-based modifiers have no effect when `.springify()` is used.

#### Spring-based&#x20;

Spring-based modifiers rely on [`withSpring`](/docs/animations/withSpring) function.

```javascript
ZoomInRotate.springify()
  .damping(30)
  .mass(5)
  .stiffness(10)
  .overshootClamping(false)
  .energyThreshold(6e-8);
```

* `.springify()` enables the spring-based animation configuration.
* `.damping(value: number)` decides how quickly a spring stops moving. Higher damping means the spring will come to rest faster. Defaults to `10`.
* `.mass(value: number)` is the weight of the spring. Reducing this value makes the animation faster. Defaults to `1`.
* `.stiffness(value: number)` decides how bouncy the spring is. Defaults to `100`.
* `.overshootClamping(value: boolean)` decides whether a spring can bounce over the designated position. Defaults to `false`.
* `.energyThreshold(value: number)` decides relative energy threshold below which the spring will snap without further oscillations. Defaults to `6e-9`.

#### Common&#x20;

```javascript
ZoomIn.delay(500)
  .randomDelay()
  .reduceMotion(ReduceMotion.Never)
  .withInitialValues({ transform: [{ scale: 0.5 }] })
  .withCallback((finished) => {
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(durationMs: number)` is the length of the animation (in milliseconds). Defaults to `300`.
* `.delay(durationMs: number)` is the delay before the animation starts (in milliseconds). Defaults to `0`.
* `.randomDelay()` randomizes the delay of the animation between `0` and the provided delay. Uses 1000 ms if delay wasn't provided.
* `.reduceMotion(reduceMotion: ReduceMotion)` determines how the animation responds to the device's reduced motion accessibility setting.
* `.withInitialValues(values: StyleProps)` allows to override the initial config of the animation.
* `.withCallback(callback: (finished: boolean) => void)` is the callback that will fire after the animation ends. Sets `finished` to `true` when animation ends without interruptions, and `false` otherwise.

## Platform compatibility
