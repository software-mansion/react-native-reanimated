---
id: withSequence
title: withSequence
sidebar_label: withSequence
---

Runs the provided animations in a sequence.
This modifier takes one or more animation objects as arguments (however fewer than two does not make too much sense).
Then the execution starts by running the first animation, and the next one is started immediately after the first one is over.

### Arguments

#### `...animations` [Variable number of animation objects]

The animations to be run in sequence.

### Returns

This method returns an animation object. It can be either assigned directly to a Shared Value or can be used as a value for a style object returned from [`useAnimatedStyle`](useAnimatedStyle).

## Example

In the below example the Shared Values is initialized with 0.
We start a sequence of timing animations: first from 0 to 70 and then back to 0.
The sequence will will result in the value returning to the original position.

```js
sharedValue.value = withSequence(withTiming(70), withTiming(0))
```

