# SharedTransition

`SharedTransition` is a builder that sets how a shared view moves. Pass it to the [`sharedTransitionStyle`](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/shared-transition-props#sharedtransitionstyle) prop. Without modifiers, the view moves with a 500 ms [`withTiming`](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming) animation.

## Reference

```tsx
import Animated, { SharedTransition, Easing } from 'react-native-reanimated';

// highlight-next-line
const transition = SharedTransition.duration(400).easing(Easing.out(Easing.cubic));

function Photo() {
  return (
    <Animated.View
      sharedTransitionTag="photo"
      // highlight-next-line
      sharedTransitionStyle={transition}
    />
  );
}
```

## Modifiers

### Easing&#x20;

Easing modifiers use the [`withTiming`](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming) function.

```javascript
SharedTransition.duration(400).easing(Easing.out(Easing.cubic));
```

* `.easing(easingFunction: EasingFunction)` sets the animation curve. Defaults to `Easing.inOut(Easing.quad)`.

> **Note**
>
> The `.easing(...)` modifier has no effect when you use `.springify()`.

### Spring-based&#x20;

Spring-based modifiers use the [`withSpring`](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring) function. As in the `withSpring` config, a spring is duration-based (`duration` and `dampingRatio`) or physics-based (`mass`, `damping` and `stiffness`).

```javascript
// duration-based
SharedTransition.springify(600).dampingRatio(0.7);

// physics-based
SharedTransition.springify().damping(15).stiffness(150);
```

* `.springify(duration?: number)` uses a spring for the transition. The optional argument sets the perceptual duration of the spring in milliseconds. The spring stops after about 1.5 times this value. Defaults to `500`.
* `.dampingRatio(value: number)` sets how damped the spring is. Value `1` means that the spring is critically damped, and value `>1` means that the spring is overdamped. Defaults to `1`.
* `.damping(value: number)` sets how quickly the spring stops. Higher damping means that the spring stops faster. Defaults to `120`.
* `.mass(value: number)` is the weight of the spring. A lower value makes the animation faster. Defaults to `4`.
* `.stiffness(value: number)` sets the stiffness of the spring. Defaults to `900`.
* `.overshootClamping(value: boolean)` sets whether the spring can go past its target. Defaults to `false`.
* `.energyThreshold(value: number)` sets the relative energy below which the spring stops. Defaults to `6e-9`.

> **Info**
>
> If you set `damping`, `mass` or `stiffness` without a duration and without `dampingRatio`, the spring is physics-based. In all other cases, the spring uses a duration, which is 500 ms by default.

### Common&#x20;

```javascript
SharedTransition.duration(400)
  .delay(100)
  .reduceMotion(ReduceMotion.System)
  .withCallback((finished) => {
    'worklet';
    console.log(`finished without interruptions: ${finished}`);
  });
```

* `.duration(duration: number)` sets the length of the animation in milliseconds. Defaults to `500`.
* `.delay(duration: number)` sets the time before the animation starts, in milliseconds. Defaults to `0`.
* `.reduceMotion(reduceMotion: ReduceMotion)` sets how the transition responds to the reduced motion [accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility) setting of the device. When reduced motion applies to one of the two views, the transition does not run, and the views show in their own places.
* `.withCallback(callback: (finished: boolean) => void)` sets a function that runs once, when the transition ends. The callback is automatically [workletized](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#to-workletize) and runs on the [UI thread](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#ui-thread). `finished` is `true` when the view lands at its target, and `false` when the transition stops before that or does not move the view.

When a new transition of the same tag starts before the first one ends, for example when the user goes back, the first callback gets `false`, and the new transition reports its own result. During an iOS back gesture, the callback gets `true` when the navigation completes, and `false` when the user cancels the gesture.

### Shared transition modifiers&#x20;

* [`.fadeContent(config?)`](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/children-of-shared-views#fadecontent) fades the children of the view during the transition.
* [`.custom(animation)`](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/custom-animations) uses your own animation worklet.
* [`.progressAnimation(animation)` and `.defaultTransitionType(type)`](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/progress-transitions) set the transition that follows the progress of the screen change.

## Remarks

* `.springify()` sets the duration again. Call `.springify(duration)` with the duration that you want, not `.duration(...)` before `.springify()`.
* The transition uses the builder of the view that it starts from. See [`sharedTransitionStyle`](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/shared-transition-props#sharedtransitionstyle).

## Platform compatibility
