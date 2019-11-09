## `timing`

```js
timing(
  clock,
  { finished, position, frameTime, time },
  { toValue, duration, easing }
);
```

Updates `position` node by running timing based animation from a given position to a destination determined by `toValue`. The animation is expected to last `duration` milliseconds and use `easing` function that could be set to one of the nodes exported by the `Easing` object.
The `frameTime` node will also get updated and represents the progress of animation in milliseconds (how long the animation has lasted so far), similar to the `time` node that just indicates the last clock time the animation node has been evaluated. Both of these variables are expected to be reset before restarting the animation. Finally `finished` node will be set to `1` when the position reaches the final value or when `frameTime` exceeds `duration`.
