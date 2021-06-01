---
id: entryAnimations
title: Entering Animations
sidebar_label: Entering Animations
---

## How to use predefined entering animation?

### 1. Import chosen animation
```js
    import { Animation } from 'react-native-reanimated';
```
### 2. Choose Animated Component which entering you want to animate
```js
    <AnimatedComponent entering={Animation} >
```
### 3. Customize the animation
    If you don't know what modificators the animation provides then find your animation down below.
```js
    <AnimatedComponent entering={Animation.duration(3000).otherModificator()} >
```
### 4. Make sure that your animated component is under an AnimatedLayout. If it's not then add AnimatedLayout somewhere above the component.
```js
    <AnimatedLayout> // +
        <View> sth </View>
        <View> 
            <AnimatedComponent entering={Animation}>
        </View>
    </AnimatedLayout> // +
```

## Predefined Animations 
If you cannot find animation that suit you then, please create your custom animation. If you think that the animation should be 
here then, plase open an issue or even better pull-request. 

### Fade

#### Animations
- FadeIn
- FadeInRight
- FadeInLeft
- FadeInUp
- FadeInDown

#### Modificators
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

#### Animations
- BounceIn
- BounceInRight
- BounceInLeft
- BounceInUp
- BounceInDown

#### Modificators
* `duration` (in ms) default: 250
* `delay` (in ms) default: 0

#### Example
<video src="https://user-images.githubusercontent.com/36106620/120317341-cc3cd880-c2de-11eb-9d72-4065c740667e.mov" controls="controls" muted="muted"></video>

### Flip

#### Animations
- FlipInYRight
- FlipInYLeft
- FlipInXUp
- FlipInXDown
- FlipInEasyX
- FlipInEasyY

#### Modificators
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

#### Animations
- StretchInX
- StretchInY

#### Modificators
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

#### Animations
- ZoomIn
- ZoomInRotate
- ZoomInRight
- ZoomInLeft
- ZoomInUp
- ZoomInDown
- ZoomInEasyUp
- ZoomInEadyDown

#### Modificators
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

#### Animations
- SlideInRight
- SlideInLeft
- SlideInUp
- SlideInDown

#### Modificators
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
