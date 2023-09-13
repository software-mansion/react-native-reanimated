---
id: getRelativeCoords
title: getRelativeCoords
sidebar_label: getRelativeCoords
---

Determines the location on the screen, relative to the given view. It might be useful when there are only absolute coordinates available and you need coordinates relative to the parent.

### Arguments

#### animatedRef

The product of [`useAnimatedRef`](/docs/2.x/api/hooks/useAnimatedRef) is Reanimated's extension of a standard React ref (delivers the view tag on the UI thread). This ref should be passed as a prop to the view relative to which we want to know coordinates.

#### x

Absolute `x` coordinate.

#### y

Absolute `y` coordinate

### Returns

Object which contains relative coordinates

- `x`
- `y`

### Example

```js
const Comp = () => {
  const aref = useAnimatedRef();
  // ...

  const gestureHandler = useAnimatedGestureHandler({
    onEnd: (event) => {
      getRelativeCoords(aref, event.absoluteX, event.absoluteY);
    },
  });

  return (
    <View ref={aref}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.box]} />
      </PanGestureHandler>
    </View>
  );
};
```
