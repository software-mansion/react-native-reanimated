# Usage

The usage of the React Native Reanimated CSS Animations Library resembles the implementation of animations and transitions on the web. For detailed information on web CSS animations, you can refer to [MDN's CSS Animation documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/animation). Similarly, for CSS transitions, you can refer to [MDN's CSS Transition documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/transition).

## Table of Contents

1. [Animations](#animations)
   - [Animation Properties](#animation-properties)
   - [Updating Animation Properties](#updating-animation-properties)
   - [Example](#animations-example)
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

### Updating Animation Properties

All animation properties can be updated after the animation is attached to the view. Modifying the `animationName` keyframes object cancels the current animation and starts a new one. Updates to other animation properties modify the current animation without cancellation of the animation.

### Animations Example

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
  CSSAnimationConfig,
} from 'react-native-reanimated';

const rotate: CSSAnimationKeyframes = {
  to: {
    transform: [{ rotate: '360deg' }],
  },
};

const config: CSSAnimationConfig = {
  animationName: rotate,
  animationDuration: 1500,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'easeInOut',
};

<Animated.View style={config} />;
```

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
  CSSTransitionConfig,
} from 'react-native-reanimated';

const transitionProps: CSSTransitionProperty = ['width', 'height'];

const transitionConfig: CSSTransitionConfig = {
  transitionProperty: transitionProps,
  transitionDuration: '300ms',
  transitionDelay: '100ms',
  transitionTimingFunction: 'easeOut',
};

<Animated.View style={[transitionConfig, { width, height }]} />; // width and height change
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
