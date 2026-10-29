# Animation recordings

`recordAnimationUpdates()` reads ShadowTree props by default. Select
`{ nativeSource: 'mountedView' }` to read native opacity and background color.
Mounted recordings reject other properties. `getAnimatedStyle()` always reads the
ShadowTree.

Use this order for frame comparisons:

```ts
await mockAnimationTimer();
const recording = await recordAnimationUpdates({ nativeSource: 'mountedView' });
// Start the animation and wait for the required frames.
await stopRecordingAnimationUpdates();
const { updates, nativeSnapshots } = await recording.getSnapshots(component);
expect(updates).toMatchNativeSnapshots(nativeSnapshots, false, 0);
```

Paired snapshots require the mocked animation timer. They combine operations for
each view in each frame. Stop finishes the current frame and fixes both arrays.
Paired snapshots do not support layout animations.

`getUpdates(component)` returns raw operations. `getAllUpdates()` returns raw
operations for all views in send order. Specify a component when a recording has
more than one view. A direct update with no known tag stays in its own group in a
ShadowTree recording. If any such group exists, all reads that name a component
throw. Use `getAllUpdates()` instead. These updates cannot supply mounted snapshots.

The native snapshot matcher uses an offset of one for raw operations. Pass zero
for paired frame snapshots. Both modes check the last value.

Recorder errors do not stop app updates. A read reports the first recorder error.
Cleanup reports errors that no getter reported. Stop restores all hooks, including after a test fails. Stop a recording before
starting another one.

# Native transform reads

`getMountedViewProps()` and `getPresentedViewProps()` return
`transformTranslateX` and `transformTranslateY`. These are the translation parts
of the resolved native transform, in points. They include transform-origin
adjustments. The frame fields `x` and `y` still exclude transforms.

Use these fields to check resolved translation components. Android skew uses a separate
animation matrix, so these fields cannot check skew. They do not describe a full
transform matrix or provide rotation, scale, or perspective checks. Mounted
recordings still accept only opacity and background color.
