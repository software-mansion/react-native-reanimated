## `decay`

```js
decay(clock, { finished, velocity, position, time }, { deceleration });
```

Updates `position` and `velocity` nodes by running a single step of animation each time this node evaluates. State variable `finished` is set to `1` when the animation gets to the final point (that is the velocity drops under the level of significance). The `time` state node is populated automatically by this node and refers to the last clock time this node got evaluated. It is expected to be reset each time we want to restart the animation. Decay animation can be configured using `deceleration` config param and it controls how fast the animation decelerates. The value should be between `0` and `1` but only values that are close to `1` will yield meaningful results.
