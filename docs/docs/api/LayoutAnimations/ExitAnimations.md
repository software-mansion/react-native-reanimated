---
id: exitAnimations
title: Exiting Animations
sidebar_label: Exiting Animations
---

## How to use predefined exiting animation?

### 1. Import chosen animation
```js
    import { Animation } from 'react-native-reanimated';
```
### 2. Choose Animated Component which exiting you want to animate
```js
    <AnimatedComponent exiting={Animation} >
```
### 3. Customize the animation
    If you don't know what Modifiers the animation provides then find your animation down below.
```js
    <AnimatedComponent exiting={Animation.duration(3000).otherModifier()} >
```
### 4. Make sure that your animated component is under an AnimatedLayout. If it's not then add AnimatedLayout somewhere above the component.
```js
    <AnimatedLayout> // +
        <View> sth </View>
        <View> 
            <AnimatedComponent exiting={Animation}>
        </View>
    </AnimatedLayout> // +
```

## Predefined Animations 
If you cannot find an animation that suits you then please create your custom animation. If you think that the animation should be here, please open an issue or create a pull request. 

### Fade

#### Animations
- FadeOut
- FadeOutRight
- FadeOutLeft
- FadeOutUp
- FadeOutDown

#### Modifiers
* `duration` (in ms) default: 300
* `delay` (in ms) default: 0
* `easing` same easing worklet as with `withTiming`
* `springify` change animation to spring
* `damping ` default: 10
* `mass` default: 1
* `stiffness` default: 100
* `overshootClamping` default: false
* `restDisplacementThreshold` default: 0.001
* `restSpeedThreshold` default: 0.001

#### Example
<video src="https://user-images.githubusercontent.com/36106620/120317304-c1824380-c2de-11eb-8aed-4c83cfe2f2cc.mov" controls="controls" muted="muted"></video>

### Bounce

#### Animations
- BounceOut
- BounceOutRight
- BounceOutLeft
- BounceOutUp
- BounceOutDown

#### Modifiers
* `duration` (in ms) default: 250
* `delay` (in ms) default: 0

#### Example
<video src="https://user-images.githubusercontent.com/36106620/120317374-d52daa00-c2de-11eb-9fc5-320dfaf50440.mov" controls="controls" muted="muted"></video>

### Flip

#### Animations
- FlipOutYRight
- FlipOutYLeft
- FlipOutXUp
- FlipOutXDown
- FlipOutEasyX
- FlipOutEasyY

#### Modifiers
* `duration` (in ms) default: 300
* `delay` (in ms) default: 0
* `easing` same easing worklet as with `withTiming`
* `springify` change animation to spring
* `damping ` default: 10
* `mass` default: 1
* `stiffness` default: 100
* `overshootClamping` default: false
* `restDisplacementThreshold` default: 0.001
* `restSpeedThreshold` default: 0.001

#### Example
<video src="https://user-images.githubusercontent.com/36106620/120317439-e971a700-c2de-11eb-89d7-1a934922b7fd.mov" controls="controls" muted="muted"></video>

### Stretch

#### Animations
- StretchOutX
- StretchOutY

#### Modifiers
* `duration` (in ms) default: 300
* `delay` (in ms) default: 0
* `easing` same easing worklet as with `withTiming`
* `springify` change animation to spring
* `damping ` default: 10
* `mass` default: 1
* `stiffness` default: 100
* `overshootClamping` default: false
* `restDisplacementThreshold` default: 0.001
* `restSpeedThreshold` default: 0.001

#### Example
<video src="https://user-images.githubusercontent.com/36106620/120317500-fbebe080-c2de-11eb-9901-693aa4ad0ba0.mov" controls="controls" muted="muted"></video>

### Zoom

#### Animations
- ZoomOut
- ZoomOutRotate
- ZoomOutRight
- ZoomOutLeft
- ZoomOutUp
- ZoomOutDown
- ZoomOutEasyUp
- ZoomOutEadyDown

#### Modifiers
* `duration` (in ms) default: 300
* `delay` (in ms) default: 0
* `easing` same easing worklet as with `withTiming`
* `springify` change animation to spring
* `damping ` default: 10
* `mass` default: 1
* `stiffness` default: 100
* `overshootClamping` default: false
* `restDisplacementThreshold` default: 0.001
* `restSpeedThreshold` default: 0.001

#### Example
<video src="https://user-images.githubusercontent.com/36106620/120317554-0efeb080-c2df-11eb-88cf-6ec47778dccb.mov" controls="controls" muted="muted"></video>

### Slide

#### Animations
- SlideOutRight
- SlideOutLeft
- SlideOutUp
- SlideOutDown

#### Modifiers
* `duration` (in ms) default: 300
* `delay` (in ms) default: 0
* `easing` same easing worklet as with `withTiming`
* `springify` change animation to spring
* `damping ` default: 10
* `mass` default: 1
* `stiffness` default: 100
* `overshootClamping` default: false
* `restDisplacementThreshold` default: 0.001
* `restSpeedThreshold` default: 0.001

#### Example
<video src="https://user-images.githubusercontent.com/36106620/120317603-22118080-c2df-11eb-9083-b5ba3f043dbc.mov" controls="controls" muted="muted"></video>
