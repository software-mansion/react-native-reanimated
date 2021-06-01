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
<video src="https://user-images.githubusercontent.com/36106620/120315698-ed9cc500-c2dc-11eb-8d23-150c41aaa733.mov" controls="controls" muted="muted"></video>

### OpacityIn
[gif]
#### Modificators
* `duration` (in ms) default: 300
* `delay` (in ms) default: 0
* `easing` same easing worklet as with `withTiming`

### SlideInDown 
[gif]
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

### SlideInLeft
[gif]
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

### SlideInRight
[gif]
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
