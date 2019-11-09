## `spring`

```js
spring(
  clock,
  { finished, position, velocity, time },
  {
    damping,
    mass,
    stiffness,
    overshootClamping,
    restSpeedThreshold,
    restDisplacementThreshold,
    toValue,
  }
);
```

When evaluated, updates `position` and `velocity` nodes by running a single step of spring based animation. Check the original `Animated` API docs to learn about the config parameters like `damping`, `mass`, `stiffness`, `overshootClamping`, `restSpeedThreshold` and `restDisplacementThreshold`. The `finished` state updates to `1` when the `position` reaches the destination set by `toValue`. The `time` state variable also updates when the node evaluates and it represents the clock value at the time when the node got evaluated for the last time. It is expected that `time` variable is reset before spring animation can be restarted.
