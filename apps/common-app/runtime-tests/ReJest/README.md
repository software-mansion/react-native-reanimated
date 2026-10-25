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
more than one view. A direct update with no known tag has its own group in a
ShadowTree recording; it cannot supply mounted snapshots.

The native snapshot matcher uses an offset of one for raw operations. Pass zero
for paired frame snapshots. Both modes check the last value.

Recorder errors do not stop app updates. A read reports the first recorder error.
Stop restores all hooks, including after a test fails. Stop a recording before
starting another one.
