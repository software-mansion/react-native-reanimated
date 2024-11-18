# Limitations and Known Issues

## Android-specific issues

### Animation removal

After removing the animation from view style props on Android, changes applied during the animation sometimes aren't reverted. Removal of styles applied during animation works properly on iOS, though.

## Cross-Platform Issues

### Style Inheritance

Style inheritance is not supported. Properties that would normally inherit values (e.g., `textDecorationColor` inheriting from `color`) must be provided separately, as inheritance is not yet supported.

### Relative Margins

Relative margins (e.g. `10%`) are not calculated properly. This limitation stems from React Native, because the yoga layout engine does not handle these calculations correctly.

### Mixed-Unit Border Radius

Yoga calculates borders in different ways for numeric values and relative (%) values. For the first one, it applies the same radius on both edges of the container which are near the rounded corner. For the second one, it applies different radius to the shorter edge and different to the longer one, depending on the length of the container edge. Currently, there is no possibility to properly interpolate between absolute (numeric) and relative (%) values.

### FlexBasis

Even though changes of this property are calculated properly during the animation, they aren't applied to the view. Other flex properties, such as `flexBasis` and `flexShrink` work fine, so they should be used for animations if possible.

### Fill mode with Fractional Iteration Count

The `forwards` and `both` fillMode options may not work correctly when combined with fractional `animationIterationCount`, particularly when relative units are used, and those relative values change after the animation ends.

For instance, if a child view's size depends on its parent’s size and the parent resizes after the animation ends, the child view may not reflect this change. This issue occurs when keyframes use a mix of relative (e.g., percentage-based) and absolute (numeric) units. Once the animation completes, the view retains the size from the last calculated keyframe and does not update according to the new parent size.

In such cases, the view remains static instead of adapting to the updated size as expected.

## Need Help?

If you encounter other issues that aren't listed above, please let us know on [#reanimated-4-private-beta](https://discord.com/channels/464786597288738816/1308044483283390494) channel on Software Mansion Discord server.
