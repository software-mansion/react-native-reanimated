---
id: entryAnimations
title: Entering Animations
sidebar_label: Entering Animations
---
In React Native every component appears instantly whenever you add it to the component hierarchy. It's not something we are used to in the real world. Layout Animations are here to address the problem and help you animate an appearance of any view.

We provide an easy API that allows you to code almost any animation you want. Because some of the animations are more frequently used than the others we coded them for you and provided in an accessible way. Below you can find an instruction step by step explaining how to use them. A little further down you will find a detailed description of all the predefined entering animations.

## How to use predefined entering animation?

### 1. Import chosen animation
```js
// AnimationName is just an example and should be replaced by real animation. For Instance FadeIn
import { AnimationName } from 'react-native-reanimated'; 
```
### 2. Choose Animated Component which entering you want to animate
```js
// AnimatedComponent - component created by createAnimatedComponent or imported from Reanimated
<AnimatedComponent entering={AnimationName} > 
```
### 3. Customize the animation
Different type of entering animations can be customized differently. For the complete list of option please refer to the paragraph specific to the particulr animation type.
```js
<AnimatedComponent entering={AnimationName.duration(3000).otherModifier()} >
```
### 4. Make sure that your animated component is under an AnimatedLayout. If it's not then add AnimatedLayout somewhere above the component.
```js
<AnimatedLayout> // +
    <View> sth </View>
    <View> 
        <AnimatedComponent entering={AnimationName}>
    </View>
</AnimatedLayout> // +
```

## Predefined Animations 
Below we listed all of the currently available predefined entering animations grouped by their type. Each group contains all of its modifiers and a video presenting what it looks like when applied to a simple button.

If you cannot find an animation that suits you then you can create a custom one. If you think that the animation should be here, please open an issue or create a pull request. 

### Fade

Simple animation based on changing of opacity.

#### Animations
- FadeIn
- FadeInRight
- FadeInLeft
- FadeInUp
- FadeInDown

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
<video src="https://user-images.githubusercontent.com/36106620/120317260-b3ccbe00-c2de-11eb-8434-8998b12dfa3c.mov" controls="controls" muted="muted"></video>

### Bounce

Animation based on smoothly shaking of component.

#### Animations
- BounceIn
- BounceInRight
- BounceInLeft
- BounceInUp
- BounceInDown

#### Modifiers
* `duration` (in ms) default: 250
* `delay` (in ms) default: 0

#### Example
<video src="https://user-images.githubusercontent.com/36106620/120317341-cc3cd880-c2de-11eb-9d72-4065c740667e.mov" controls="controls" muted="muted"></video>

### Flip

3D animation based on flipping object over specific axis.

#### Animations
- FlipInYRight
- FlipInYLeft
- FlipInXUp
- FlipInXDown
- FlipInEasyX
- FlipInEasyY

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
<video src="https://user-images.githubusercontent.com/36106620/120317406-deb71200-c2de-11eb-8dee-c658a4e1e47a.mov" controls="controls" muted="muted"></video>

### Stretch

Animation based on changing width or height of object.

#### Animations
- StretchInX
- StretchInY

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
<video src="https://user-images.githubusercontent.com/36106620/120317473-f42c3c00-c2de-11eb-8772-b366c2ddde7f.mov" controls="controls" muted="muted"></video>

### Zoom

Animation based on changing scale of object.

#### Animations
- ZoomIn
- ZoomInRotate
- ZoomInRight
- ZoomInLeft
- ZoomInUp
- ZoomInDown
- ZoomInEasyUp
- ZoomInEadyDown

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
<video src="https://user-images.githubusercontent.com/36106620/120317529-04441b80-c2df-11eb-9627-c56e986e44c1.mov" controls="controls" muted="muted"></video>

### Slide

Animation based on horizontal or vertical moving of object.

#### Animations
- SlideInRight
- SlideInLeft
- SlideInUp
- SlideInDown

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
<video src="https://user-images.githubusercontent.com/36106620/120317587-1a51dc00-c2df-11eb-937a-c53a237afca2.mov" controls="controls" muted="muted"></video>

### LightSpeed

Animation based on horizontal moving of object with changing of opacity and skew.

#### Animations
- LightSpeedInRight
- LightSpeedInLeft

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
<video src="https://user-images.githubusercontent.com/48885911/125057634-c094bc80-e0a9-11eb-98d9-0c8eed1e63b0.mov" controls="controls" muted="muted"></video>

### Pinwheel

Animation based on rotation with scale and opacity change.

#### Animations
- PinwheelIn

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
<video src="https://user-images.githubusercontent.com/48885911/125058126-40228b80-e0aa-11eb-8396-7f373af7fcbe.mov" controls="controls" muted="muted"></video>

### Roll

Animation based on horizontal moving of object with rotation.

#### Animations
- RollInLeft
- RollInRight

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
<video src="https://user-images.githubusercontent.com/48885911/125058243-60524a80-e0aa-11eb-94c8-79728688e2f3.mov" controls="controls" muted="muted"></video>

### Rotate

Animation based on rotation of object.

#### Animations
- RotateInDownLeft
- RotateInDownRight
- RotateInUpLeft
- RotateInUpRight

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
<video src="https://user-images.githubusercontent.com/48885911/125058359-79f39200-e0aa-11eb-8c78-c31e461e3748.mov" controls="controls" muted="muted"></video>