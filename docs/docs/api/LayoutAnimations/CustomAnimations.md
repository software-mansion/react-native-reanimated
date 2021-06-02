---
id: customAnimations
title: Custom Animations
sidebar_label: Custom Animations
---

If our set of predefined animations is not enough for you then this tab is what you are looking for.

## Custom Exiting Animation

What our exiting animation builders do under the hood is generating a worklet function that returns essential data for starting particular animation. 
The high level template looks like this:

```js
function CustomExitingAnimation(startingValues) {
    'worklet'
    const animations = {
        // your animations
    };
    const initialValues = {
        // initial values for animations
    };
    return {
      initialValues,
      animations,
    }
}
```

* `startingValues` - contains information about where view was displayed and what were its dimentions
    * `startingValues.originX` - X coordinate of top left corner in parent's coordinate system
    * `startingValues.originY` - Y coordinate of top left corner in parent's coordinate system
    * `startingValues.width` - view's width
    * `startingValues.height` - view's height
    * `startingValues.globalOriginX` - X coordinate of top left corner in global coordinate system
    * `startingValues.globalOriginY` - Y coordinate of top left corner in global coordinate system

### Example
```js

function CardView() {
  const exiting = (startingValues) => {
    'worklet';
    const animations = {
      originX: withTiming(width, { duration: 3000 }),
      opacity: withTiming(0.5, { duration: 2000 }),
    };
    const initialValues = {
      originX: startingValues.originX,
      opacity: 1,
    };
  }


  return (
    <Animated.View
      style={[styles.animatedView]} exiting={exiting} >
      <Text> Card Example </Text>
    </Animated.View>
  );
}

```

## Custom Entering Animation

What our entering animation builders do under the hood is generating a worklet function that returns essential data for starting particular animation. 
The high level template looks like this:

```js
function CustomEnteringAnimation(targetValues) {
    'worklet'
    const animations = {
        // your animations
    };
    const initialValues = {
        // initial values for animations
    };
    return {
      initialValues,
      animations,
    }
}
```

* `targetValues` - contains information about where view wants to be displayed and what are its dimentions
    * `targetValues.originX` - X coordinate of top left corner in parent's coordinate system
    * `targetValues.originY` - Y coordinate of top left corner in parent's coordinate system
    * `targetValues.width` - view's width
    * `targetValues.height` - view's height
    * `targetValues.globalOriginX` - X coordinate of top left corner in global coordinate system
    * `targetValues.globalOriginY` - Y coordinate of top left corner in global coordinate system

### Example
```js

function CardView() {
  const entering = (targetValues) => {
    'worklet';
    const animations = {
      originX: withTiming(targetValues.originX, { duration: 3000 }),
      opacity: withTiming(1, { duration: 2000 }),
      borderRadius: withDelay(4000, withTiming(30, { duration: 3000 })),
      transform: [
        { rotate: withTiming('0deg', { duration: 4000 }) },
        { scale: withTiming(1, { duration: 3500 }) },
      ],
    };
    const initialValues = {
      originX: -width,
      opacity: 0,
      borderRadius: 10,
      transform: [{ rotate: '90deg' }, { scale: 0.5 }],
    };
    return {
      initialValues,
      animations,
    };
  };


  return (
    <Animated.View
      style={[styles.animatedView]} entering={entering} >
      <Text> Card Example </Text>
    </Animated.View>
  );
}

```

## Custom Layout Transtion

What our layout transition builders do under the hood is generating a worklet function that returns essential data for starting particular transition. 
The high level template looks like this:

```js
function CustomLayoutTransition(values) {
    'worklet'
    const animations = {
        // your animations
    };
    const initialValues = {
        // initial values for animations
    };
    return {
      initialValues,
      animations,
    }
}
```

* `values` - contains before and after information about the view's origin and dimations
    * `values.originX` - X coordinate of top left corner in parent's coordinate system (after)
    * `values.originY` - Y coordinate of top left corner in parent's coordinate system (after)
    * `values.width` - view's width (after)
    * `values.height` - view's height (after)
    * `values.globalOriginX` - X coordinate of top left corder in global coordinate system (after)
    * `values.globalOriginY` - Y coordinate of top left corder in global coordinate system (after)
    * `values.boriginX` - X coordinate of top left corner in parent's coordinate system (before)
    * `values.boriginY` - Y coordinate of top left corner in parent's coordinate system (before)
    * `values.bwidth` - view's width (before)
    * `values.bheight` - view's height (before)
    * `values.bglobalOriginX` - X coordinate of top left corner in global coordinate system (before)
    * `values.bglobalOriginY` - Y coordinate of top left corner in global coordinate system (before)

### Example
<video src="https://user-images.githubusercontent.com/12784455/120450759-09fa3980-c391-11eb-9b64-65ec8e6c2509.mp4" controls="controls" muted="muted" width="45%"></video>

```js

function CustomLayoutTransition(values) {
  'worklet'
  return {
    animations: {
      originX: withTiming(values.originX, {duration: 1000}),
      originY: withDelay(1000, withTiming(values.originY, {duration: 1000})),
      width: withSpring(values.width),
      height: withSpring(values.height),
    },
    initialValues: {
      originX: values.boriginX,
      originY: values.boriginY,
      width: values.bwidth,
      height: values.bheight,
    }
  };
}

function Box({label, state}: {label: string, state: boolean}) {
  const ind = label.charCodeAt(0) - ('A').charCodeAt(0);
  const delay = 300 * ind;
  return (
    <Animated.View 
        layout={CustomLayoutTransition} 
        style={[styles.box,
          { 
            flexDirection: (state)? 'row': 'row-reverse', 
            height: (state)? 30: 60,
          }]} 
    >
      <Text> {label} </Text>
    </Animated.View>
  );
}

export function CustomLayoutTransitionExample(): React.ReactElement {
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

## Other Facts

Each Reanimated component has its shared value that keeps current animations assigned to that particular component. If you want to start a new animation for a specific prop and you don't provide an initial value for the prop then the initial value will be taken from the last animation that has been assigned to the component. The only exception is Entering animation because we have no way to get the previous animation values.
