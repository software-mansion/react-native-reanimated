---
id: layoutTransitions
title: Layout Transitions
sidebar_label: Layout Transitions
---

## How to use layout transition?

### 1. Import Layout 
```js
    import { Layout } from 'react-native-reanimated';
```
### 2. Choose Animated Component which layout you want to animate
```js
    <AnimatedComponent layout={Layout} >
```
### 3. Customize the animation
```js
    <AnimatedComponent layout={Layout.duration(3000).otherModificator()} >
```
### 4. Make sure that your animated component is under an AnimatedLayout. If it's not then add AnimatedLayout somewhere above the component.
```js
    <AnimatedLayout> // +
        <View> sth </View>
        <View> 
            <AnimatedComponent exiting={animation}>
        </View>
    </AnimatedLayout> // +
```

## Available modifiers
The order of modificators doesn't matter.
### springify 
The default animation used for layout transitions is `timing`. Use this modifier to change animation to `spring`.
```js
    Layout.otherModifier().(...).springify().(...).otherModifier();
```

### damping (spring only)
default: 10

### mass (spring only)
default: 1

### stiffness (spring only)
default: 100

### overshootClamping (spring only)
default: false

### restDisplacementThreshold (spring only)
default: 0.001

### restSpeedThreshol (spring only)
default: 0.001

### duration (only without spring)
default: 300
How long the animation should last

### easing (only without spring)
Worklet that drives the easing curve for the animation

### delay
default: 0
Allows to start with a specified delay.

## Example

<video src="https://user-images.githubusercontent.com/36106620/120326673-44100080-c2e9-11eb-8b14-564d3b4e3102.mov" controls="controls" muted="muted"></video>

```js
function Box({label, state}: {label: string, state: boolean}) {
  const ind = label.charCodeAt(0) - ('A').charCodeAt(0);
  const delay = 300 * ind;
  return (
    <Animated.View 
        layout={Layout.delay(delay).springify()} 
        style={[styles.box,
          { 
            flexDirection: (state)? 'row': 'row-reverse', 
            height: (state)? 30 : 60,
          }]} 
    >
      <Text> {label} </Text>
    </Animated.View>
  );
}

export function SpringLayoutAnimation(): React.ReactElement {
  const [state, setState] =  useState(true);
  return (
    <View style={{marginTop: 30}} >
      <View style={{height: 300}} >
        <AnimatedLayout style={{flexDirection: state? 'row' : 'column'}} >
          {state && <Box key="a" label="A" state={state} />}
          <Box key="b" label="B" state={state} />
          {!state && <Box key="a" label="A" state={state} />}
          <Box key="c" label="C" state={state} />
        </AnimatedLayout>
      </View>
    
      <Button onPress={() => {setState(!state)}} title="toggle" />
    </View>
  );
}
```
