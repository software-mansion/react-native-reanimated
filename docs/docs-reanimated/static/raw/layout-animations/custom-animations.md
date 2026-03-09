# Custom animations

Custom animations give you a full control over the Entering/Exiting animations and Layout transitions. However, they tend to be hard to understand and maintain. We recommend starting with predefined [Entering/Exiting](/docs/layout-animations/entering-exiting-animations), [Keyframes](/docs/layout-animations/keyframe-animations) and [Layout](/docs/layout-animations/layout-transitions) presets first before using custom animations.

## Reference

```js
function CustomAnimation(values) {
  'worklet';
  const animations = {
    // your animations
  };
  const initialValues = {
    // initial values for animations
  };
  const callback = (finished: boolean) => {
    // optional callback that will fire when layout animation ends
  };
  return {
    initialValues,
    animations,
    callback,
  };
}
```

## Custom Exiting Animation

Type definitions

```typescript
function CustomExitTransition (values: ExitAnimationsValues) => LayoutAnimation

type LayoutAnimation = {
    initialValues: StyleProps;
    animations: StyleProps;
    callback?: (finished: boolean) => void;
};

type ExitAnimationsValues = CurrentLayoutAnimationsValues &
  WindowDimensions;

type CurrentLayoutAnimationsValues = {
  ['currentOriginX', 'currentOriginY', 'currentWidth', 'currentHeight', 'currentBorderRadius', 'currentGlobalOriginX','currentGlobalOriginY']: number;
};

interface WindowDimensions {
    windowWidth: number;
    windowHeight: number;
}
```

### Arguments

* `values` - contains information about where view was displayed and what were its dimensions
  * `values.currentOriginX` - X coordinate of top left corner in parent's coordinate system
  * `values.currentOriginY` - Y coordinate of top left corner in parent's coordinate system
  * `values.currentWidth` - view's width
  * `values.currentHeight` - view's height
  * `values.currentBorderRadius` - view's border radius
  * `values.currentGlobalOriginX` - X coordinate of top left corner in global coordinate system
  * `values.currentGlobalOriginY` - Y coordinate of top left corner in global coordinate system

### Example

## Custom Entering Animation

Type definitions

```typescript
function CustomEntryTransition (values: EntryAnimationsValues) => LayoutAnimation

type LayoutAnimation = {
    initialValues: StyleProps;
    animations: StyleProps;
    callback?: (finished: boolean) => void;
};

type EntryAnimationsValues = TargetLayoutAnimationsValues &
  WindowDimensions;

type TargetLayoutAnimationsValues = {
  ['targetOriginX', 'targetOriginY', 'targetWidth', 'targetHeight', 'targetBorderRadius', 'targetGlobalOriginX','targetGlobalOriginY']: number;
};

interface WindowDimensions {
    windowWidth: number;
    windowHeight: number;
}
```

### Arguments

* `values` - contains information about where view wants to be displayed and what are its dimensions
  * `values.targetOriginX` - X coordinate of top left corner in parent's coordinate system
  * `values.targetOriginY` - Y coordinate of top left corner in parent's coordinate system
  * `values.targetWidth` - view's width
  * `values.targetHeight` - view's height
  * `values.targetBorderRadius` - view's border radius
  * `values.targetGlobalOriginX` - X coordinate of top left corder in global coordinate system
  * `values.targetGlobalOriginY` - Y coordinate of top left corder in global coordinate system

### Example

## Custom Layout Transition

Type definitions

```typescript
function CustomLayoutTransition (values: LayoutAnimationValues) => LayoutAnimation

type LayoutAnimation = {
    initialValues: StyleProps;
    animations: StyleProps;
    callback?: (finished: boolean) => void;
};

type LayoutAnimationsValues = CurrentLayoutAnimationsValues & TargetLayoutAnimationsValues & WindowDimensions;

type CurrentLayoutAnimationsValues = {
    ['currentOriginX', 'currentOriginY', 'currentWidth', 'currentHeight', 'currentBorderRadius', 'currentGlobalOriginX','currentGlobalOriginY']: number;
};

type TargetLayoutAnimationsValues = {
    ['targetOriginX', 'targetOriginY', 'targetWidth', 'targetHeight', 'targetBorderRadius', 'targetGlobalOriginX','targetGlobalOriginY']: number;
};

interface WindowDimensions {
    windowWidth: number;
    windowHeight: number;
}
```

### Arguments

* `values` - contains before and after information about the view's origin and dimensions
  * `values.targetOriginX` - X coordinate of top left corner in parent's coordinate system
  * `values.targetOriginY` - Y coordinate of top left corner in parent's coordinate system
  * `values.targetWidth` - view's width
  * `values.targetHeight` - view's height
  * `values.targetBorderRadius` - view's border radius
  * `values.targetGlobalOriginX` - X coordinate of top left corder in global coordinate system
  * `values.targetGlobalOriginY` - Y coordinate of top left corder in global coordinate system
  * `values.currentOriginX` - X coordinate of top left corner in parent's coordinate system (before)
  * `values.currentOriginY` - Y coordinate of top left corner in parent's coordinate system (before)
  * `values.currentWidth` - view's width (before)
  * `values.currentHeight` - view's height (before)
  * `values.currentBorderRadius` - view's border radius (before)
  * `values.currentGlobalOriginX` - X coordinate of top left corner in global coordinate system (before)
  * `values.currentGlobalOriginY` - Y coordinate of top left corner in global coordinate system (before)

### Example

## Remarks

* Each Reanimated component has a shared value that keeps the current animations assigned to that particular component. If you start a new animation for a specific property without providing an initial value for that property, the initial value will be taken from the last animation assigned to the component. The only exception is the `Entering` animation, as we have no way to get the previous animation values.

## Platform compatibility
