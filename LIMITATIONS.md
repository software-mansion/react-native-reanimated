# Limitations and Known Issues

## Cross-Platform Issues

### Style Inheritance

Style inheritance is not supported. Properties that would normally inherit values (e.g., `textDecorationColor` inheriting from `color`) must be provided separately, as inheritance is not yet implemented.

### Relative Mixed-Unit Margins

[CodePen](https://codepen.io/Mateusz-opaciski/pen/NWQVMMp?editors=1100)

#### Relative Margins

Yoga applies relative (%) margins in a different way than the web browser does. In React Native, the margin is added as a space between items without changing dimensions of the se items. As a result, the size of the parent container can change if the total size of its children with added margins exceeds the parent container size.

On the other hand, the web browser shrinks items in such a way that the specified relative margin is occupies the correct amount of space in the parent container. See the CodePen example lined above.

#### Mixed-Unit Margins

Interpolation between absolute (numeric) and relative (%) margins may not work properly if dimensions of the parent component are affected by applied margins. This is a problem with our implementation and it can be seen as incorrect animation pacing (the animation can speed up/slow down when the parent size changes).

### Mixed-Unit Border Radius

Yoga calculates borders in different ways for numeric values and relative (%) values. For the first one, it applies the same radius on both edges of the container which are near the rounded corner. For the second one, it applies different radius to the shorter edge and different to the longer one, depending on the length of the container edge. Currently, there is no possibility to properly interpolate between absolute (numeric) and relative (%) values.

### FlexBasis

Even though changes of this property are calculated properly during the animation, they aren't applied to the view. Other flex properties, such as `flexGrow` and `flexShrink` work fine, so they should be used for animations if possible.

### Fill mode with Fractional Iteration Count

[CodePen](https://codepen.io/Mateusz-opaciski/pen/YzmbwXM?editors=1100)

The `forwards` and `both` fillMode options may not work correctly when combined with fractional `animationIterationCount`, particularly when relative units are used, and those relative values change after the animation ends.

For instance, if a child view's size depends on its parent’s size and the parent resizes after the animation ends, the child view may not reflect this change. This issue occurs when keyframes use a mix of relative (e.g., percentage-based) and absolute (numeric) units. Once the animation completes, the view retains the size from the last calculated keyframe and does not update according to the new parent size.

In such cases, the view remains static instead of adapting to the updated size as expected.

## Need Help?

If you encounter other issues that aren't listed above, please let us know on [#reanimated-4-private-beta](https://discord.com/channels/464786597288738816/1308044483283390494) channel on Software Mansion Discord server.
