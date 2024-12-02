# Usage

The usage of the React Native Reanimated CSS Animations Library resembles the implementation of animations and transitions on the web. For detailed information on web CSS animations, you can refer to [MDN's CSS Animation documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/animation). Similarly, for CSS transitions, you can refer to [MDN's CSS Transition documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/transition).

## Table of Contents

1. [Animations](#animations)
   - [Animation Properties](#animation-properties)
   - [Simple Animation Examples](#simple-animation-examples)
   - [Keyframe Timing Functions](#keyframe-timing-functions)
   - [Multiple Animations](#multiple-animations)
   - [Updating Animation Properties](#updating-animation-properties)
2. [Transitions](#transitions)
   - [Transition Properties](#transition-properties)
   - [Updating Transition Properties](#updating-transition-properties)
   - [Example](#transitions-example)
3. [Easings](#easings)
   - [Predefined Easings](#predefined-easings)
   - [Parametrized Easings](#parametrized-easings)
4. [Examples and Further Resources](#examples-and-further-resources)

> [!IMPORTANT]
> CSS animations and transitions work with Animated components created with `Animated.createAnimatedComponent` from Reanimated, similarly to Reanimated's animated styles.

## Animations

Animations in the React Native Reanimated CSS Animations Library require the `animationName` property with keyframe definitions. These keyframes are defined as a JavaScript object with offset values used as keys and corresponding style properties as values. The structure of keyframes and the behavior of this and other animation properties is similar to the CSS implementation known from web.

### Animation Properties

- **animationName**: Defines the keyframes of the animation. Accepts a JavaScript object with:
  - Valid offset values: keywords (`from`, `to`), percentage strings (between `'0%'` and `'100%'`), or floating-point numbers (between `0` and `1`).
  - Style properties that apply to the specific view/component.
- **animationDuration**: Specifies the duration of the animation.
  - Accepts a non-negative number (milliseconds), seconds string (e.g. `'1.5s'`), or milliseconds string (e.g. `'1500ms'`).
- **animationDelay**: Specifies a delay before the animation starts.
  - Same format as `animationDuration`, but it also supports negative values.
- **animationTimingFunction**: Specifies the timing function of the animation.
  - Accepts predefined easings (`'linear'`, `'ease'`, `'easeIn'`, `'easeOut'`, `'easeInOut'`, `'stepStart'`, `'stepEnd'`) or parametrized functions (`cubicBezier`, `steps`, `linear`). Refer to the [Easings](#easings) section for more details.
- **animationDirection**: Specifies the direction of the animation.
  - Accepts: `'normal'`, `'reverse'`, `'alternate'`, `'alternateReverse'`.
- **animationIterationCount**: Specifies how many times the animation repeats.
  - Accepts a non-negative number or the `‘infinity'` string.
- **animationFillMode**: Specifies how the animation applies styles before/after execution.
  - Accepts: `'none'`, `'forwards'`, `'backwards'`, `'both'`.
- **animationPlayState**: Specifies whether the animation is running or paused.
  - Accepts: `'running'`, `'paused'`.

### Simple Animation Examples

**Example 1: Inline Animation Props**

```tsx
import Animated from 'react-native-reanimated';

<Animated.View
  style={{
    animationName: {
      to: {
        transform: [{ rotate: '360deg' }],
      },
    },
    animationDuration: 1500,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'easeInOut',
  }}
/>;
```

**Example 2: Using Variables for Keyframes and Configuration**

```tsx
import Animated from 'react-native-reanimated';
import type {
  CSSAnimationKeyframes,
  CSSAnimationProperties,
} from 'react-native-reanimated';

const rotate: CSSAnimationKeyframes = {
  to: {
    transform: [{ rotate: '360deg' }],
  },
};

const animation: CSSAnimationProperties = {
  animationName: rotate,
  animationDuration: 1500,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'easeInOut',
};

<Animated.View style={animation} />;
```

### Keyframe Timing Functions

The `animationTimingFunction` can be specified at two levels:

1. Animation level - applies as a default timing function for the entire animation
2. Individual keyframe level - allows control over how properties animate from this keyframe to the next where they are specified

When specified in keyframes, timing functions control the animation's progress between keyframes:

- The timing function applies from the current keyframe until the next keyframe that specifies that property
- If no subsequent keyframe specifies that property, the timing function applies until the end of the animation
- A timing function specified in the last keyframe (`100%`, `to`, or `1`) is ignored since there is no subsequent keyframe

**Example: Keyframe-specific Timing Functions**

```tsx
import Animated from 'react-native-reanimated';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';

const bounceAndSpin: CSSAnimationKeyframes = {
  '0%': {
    transform: [{ scale: 1 }, { rotate: '0deg' }],
    opacity: 1,
    animationTimingFunction: 'ease-in',
  },
  '25%': {
    opacity: 0.5,
  },
  '50%': {
    transform: [{ scale: 1.5 }, { rotate: '180deg' }],
    opacity: 1,
    animationTimingFunction: 'ease-out',
  },
  '100%': {
    transform: [{ scale: 1 }, { rotate: '360deg' }],
    opacity: 1,
    animationTimingFunction: 'linear', // This will be ignored
  },
};

<Animated.View
  style={{
    animationName: bounceAndSpin,
    animationDuration: 2000,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease', // Default timing function
  }}
/>;
```

In this example:

- `transform` property:
  - 0% to 50%: Uses `ease-in` timing
  - 50% to 100%: Uses `ease-out` timing
- `opacity` property:
  - 0% to 25%: Uses `ease-in` timing
  - 25% to 50%: Uses animation-level `ease` timing
  - 50% to 100%: Uses `ease-out` timing

For more details about timing functions and their behavior in keyframes, see [MDN's animation-timing-function documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timing-function#description).

### Multiple Animations

You can apply multiple animations to a single view by passing an array of keyframe objects to the `animationName` property.

Each animation property (like `animationDuration` or `animationDelay`) can also accept an array of values to control multiple animations separately.

You can specify values for animation properties in different ways:

- **Individual Values for Each Animation**: Provide a specific value for each animation in the array.

  ```tsx
  <Animated.View
    style={{
      animationName: [fadeInOut, moveLeft, bounce],
      animationDuration: ['2.5s', '5s', '1s'],
      animationIterationCount: [2, 1, 5],
    }}
  />
  ```

- **Single Value for All Animations**: Use the same value for all animations.

  ```tsx
  <Animated.View
    style={{
      animationName: [fadeInOut, moveLeft, bounce],
      animationDuration: '3s', // all animations take 3s
      animationIterationCount: 1, // all animations run once
    }}
  />
  ```

- **Cycling Values**: If there are fewer values than animations, the values cycle through the animations.

  ```tsx
  <Animated.View
    style={{
      animationName: [fadeInOut, moveLeft, bounce],
      animationDuration: ['2.5s', '5s'], // fadeInOut: 2.5s, moveLeft: 5s, bounce: 2.5s
      animationIterationCount: [2, 1], // fadeInOut: 2, moveLeft: 1, bounce: 2
    }}
  />
  ```

- **Ignored values**: If you provide more values than animations, any extra values will be ignored.
  ```tsx
  <Animated.View
    style={{
      animationName: [fadeInOut, moveLeft], // 2 animations
      animationDuration: ['2s', '3s', '4s'], // third value (4s) is ignored
      animationIterationCount: [1, 2, 3, 4], // values 3 and 4 are ignored
    }}
  />
  ```

> [!NOTE]
> If multiple animations target the same property, the animation later in the array will override changes from the previous one.

For more details about multiple animation property values, see [MDN's documentation on setting multiple animation property values](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations#setting_multiple_animation_property_values).

### Updating Animation Properties

All animation properties can be updated after the animation is attached to the view. Modifying the `animationName` keyframes object cancels the current animation and starts a new one. Updates to other animation properties modify the current animation without cancellation of the animation.

## Transitions

Transitions provide smooth animations between changes in style properties during re-renders of the view.

### Transition Properties

- **transitionProperty**: Specifies which properties should trigger transitions.
  - Accepts: `'none'` (no transition), `'all'` (all modified properties), or an array of valid style property names.
- **transitionDuration**: Specifies the duration of the transition.
  - Same format as `animationDuration`.
- **transitionDelay**: Specifies a delay before the transition starts.
  - Same format as `animationDelay`.
- **transitionTimingFunction**: Specifies the timing function for the transition.
  - Same format as `animationTimingFunction`.
- **transitionBehavior**: Specifies whether transitions will be started for properties with discrete animation behavior.
  - Accepts: `'allow-discrete'` (transitions will be started for discrete animated properties), `'normal'` (transitions will not be started for discrete animated properties).

When using an array of property names in `transitionProperty`, you can specify different values for different transition properties to control each property separately:

```tsx
<Animated.View
  style={{
    transitionProperty: ['width', 'height', 'backgroundColor'],
    transitionDuration: ['500ms', '1s', '300ms'],
    transitionTimingFunction: ['ease', 'linear', 'ease-in'],
    transitionDelay: ['0ms', '200ms', '100ms'],
  }}
/>
```

> [!NOTE]
> The behavior of value assignment for transition properties follows the same rules as for animations (see [Multiple Animations](#multiple-animations) section above). If there are fewer values than properties, the values cycle through the properties. If you provide more values than properties, any extra values will be ignored. For more details, see [MDN's documentation on transition property value lists](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions#when_property_value_lists_are_of_different_lengths).

### Updating Transition Properties

All transition properties can be updated after the transition is attached to the view. When `transitionProperty` is changed, any transitions associated with properties removed from it are stopped immediately, and their final styles are be applied right away. Updates to other transition properties affect the transition that is currently attached to the view.

### Transitions Example

**Example 1: Inline Transition Props**

```tsx
import Animated from 'react-native-reanimated';

<Animated.View
  style={{
    transitionProperty: ['width', 'height'],
    transitionDuration: '300ms',
    transitionDelay: '100ms',
    transitionTimingFunction: 'easeOut',
  }}
/>;
```

**Example 2: Using Variables for Transition Configuration**

```tsx
import Animated from 'react-native-reanimated';
import type {
  CSSTransitionProperty,
  CSSTransitionProperties,
} from 'react-native-reanimated';

const transitionProps: CSSTransitionProperty = ['width', 'height'];

const transitionProperties: CSSTransitionProperties = {
  transitionProperty: transitionProps,
  transitionDuration: '300ms',
  transitionDelay: '100ms',
  transitionTimingFunction: 'easeOut',
};

<Animated.View style={[transitionProperties, { width, height }]} />; // width and height change
```

## Easings

Easings control the pacing of animations and transitions.

### Predefined Easings

- **'linear'**: A constant speed from start to finish.
- **'ease'**: Starts slow, speeds up, then slows down.
- **'easeIn'**: Starts slow and accelerates.
- **'easeOut'**: Starts fast and decelerates.
- **'easeInOut'**: Starts and ends slow, with acceleration in the middle.
- **'stepStart'**: Jumps instantly at the start.
- **'stepEnd'**: Jumps instantly at the end.

### Parametrized Easings

- **cubicBezier**: Defines a custom timing function with four parameters `(x1, y1, x2, y2)` representing the curve points.
- **linear**: Takes an array of points (`number | { y: number; x: ‘${number}%’ };`).
- **steps**: Takes a `stepsNumber` and an optional modifier. Accepts one of the following values: `'jumpStart'`, `'start'`, `'jumpEnd'`, `'end'`, `'jumpNone'`, `'jumpBoth'`.

For more details, refer to [MDN's Easing Function documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function).

## Examples and Further Resources

Many useful examples demonstrating the usage of animations, transitions, and easings can be found in the `css-example` example app in this repository.
