---
id: exitAnimations
title: Exiting Animations
sidebar_label: Exiting Animations
---

In React Native during unmounting of components from the hierarchy of views, it just disappears in the next frame. However you can beautify this process using `Exiting Animations`. Reanimated make a pretty animation of disappearing of component for you.
#### How it is possible? 
Reanimated listen on changes in tree of views and if detect that some of component should disappear in next frame, It replaces this process with exiting animation. It is easy and fast. You can use predefined animations - examples below or you can define your own custom animation.

## How to use predefined exiting animation?

### 1. Import chosen animation
```js
    // AnimationName is just an example and should be replaced by real animation. For Instance FadeOut
    import { AnimationName } from 'react-native-reanimated';
```
### 2. Choose Animated Component which exiting you want to animate
```js
    // AnimatedComponent - component created by createAnimatedComponent or imported from Reanimated
    <AnimatedComponent exiting={AnimationName} >
```
### 3. Customize the animation
Different type of entering animations can be customized differently. For the complete list of option please refer to the paragraph specific to the particulr animation type.
```js
    <AnimatedComponent exiting={AnimationName.duration(3000).otherModifier()} >
```
### 4. Make sure that your animated component is under an AnimatedLayout. If it's not then add AnimatedLayout somewhere above the component.
```js
    <AnimatedLayout> // +
        <View> sth </View>
        <View> 
            <AnimatedComponent exiting={AnimationName}>
        </View>
    </AnimatedLayout> // +
```

## Predefined Animations 
Below we listed all of the currently available predefined entering animations grouped by their type. Each group contains all of its modifiers and a video presenting what it looks like when applied to a simple button.

If you cannot find an animation that suits you then you can create a custom one. If you think that the animation should be here, please open an issue or create a pull request.  

### Fade

Simple animation based on changing of opacity.

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

Animation based on smoothly shaking of component.

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

3D animation based on flipping object over specific axis.

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

Animation based on changing width or height of object.

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

Animation based on changing scale of object.

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

Animation based on horizontal or vertical moving of object.

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

### LightSpeed

Animation based on horizontal moving of object with changing of opacity and skew.

#### Animations
- LightSpeedOutRight
- LightSpeedOutLeft

#### Modifiers
* `duration` (in ms) default: 250
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
<video src="https://user-images.githubusercontent.com/48885911/125058070-2e40e880-e0aa-11eb-98eb-326a34f23f39.mov" controls="controls" muted="muted"></video>

### Pinwheel

Animation based on rotation with scale and opacity change.

#### Animations
- PinwheelOut

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
<video src="https://user-images.githubusercontent.com/48885911/125058201-57617900-e0aa-11eb-951f-46ac27787d3e.mov" controls="controls" muted="muted"></video>

### Roll

Animation based on horizontal moving of object with rotation.

#### Animations
- RollOutLeft
- RollOutRight

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
<video src="https://user-images.githubusercontent.com/48885911/125058307-6e07d000-e0aa-11eb-8379-4536c0806aee.mov" controls="controls" muted="muted"></video>

### Rotate

Animation based on rotation of object.

#### Animations
- RotateOutDownLeft
- RotateOutDownRight
- RotateOutUpLeft
- RotateOutUpRight

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
<video src="https://user-images.githubusercontent.com/48885911/125058418-8841ae00-e0aa-11eb-9ac1-39df437512c4.mov" controls="controls" muted="muted"></video>