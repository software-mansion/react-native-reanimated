# Objective 06 — Implement Final-State-First Mounting

## Goal

Make Fabric's mounted host state correct before Core Animation begins, while
preserving entering and exiting lifecycle behavior.

This is the most important architectural objective.

## Depends on

- Objective 02 stabilization.
- Objective 03 lifecycle contracts.
- Objective 05 executor interface.

## Concurrency

**Sequential blocker.** Mount ordering is a semantic foundation for every
native executor. Objective 07's IR field names may be drafted after the
post-mount synchronization mechanism is selected, but routing integration must
wait until the final-state-first tests below pass.

## Problem in the current PoC

For layout updates, the proxy starts a native animation but does not mount the
final Update mutation. The iOS code writes final values directly to the root
layer.

```text
Shadow Tree = final layout
Host component view = old layout metrics
Root CALayer model = values written manually by PoC
Pixels = may look final
Private RN sublayers/hit testing/accessibility = may remain old
```

React Native component views update internal background, border, mask, content,
and transform state from `updateLayoutMetrics`, not merely from root-layer KVC.

### Diagnostic scenarios exposing the mounting defect

These bench observations are useful because each shows a different
consequence of starting platform animation without an authoritative mounted
final state:

- `SlideInLeft` / `SlideOutRight` can remain completely invisible. The entering
  mutation installs the legacy opacity-zero workaround, while the sampled
  slide plan contains only geometry and never restores opacity.
- `FadeIn` can remain blank for its duration and then appear fully opaque,
  while `FadeOut` is visible. This entering/exiting asymmetry is evidence that
  `dispatch_async(main)` is not a reliable post-mount boundary: the opacity-zero
  mount and explicit CA animation race one another.

The earlier **Exit during layout** observation is not evidence for this defect:
the bench used a changing React key for reset, so reset itself unmounted the old
scenario and manufactured a fading retained view while a new box ran behind
it. A direct version on the same screen preserves layout motion while exiting.
Keep the scenario as an ownership/interruption case, but reassess its native
behavior only with the corrected non-remounting harness.

The remaining entering examples show that entering initialization and
post-mount ordering need an explicit mounting contract. In particular, do not
remove the opacity-zero workaround without proving delayed entering has no
final-state flash; replace it with an entering strategy whose final opacity is
represented by mounted Fabric state. The architectural requirement that final
Fabric layout metrics remain authoritative still stands independently of the
discarded bench observation.

### Presentation-layer investigation note

While implementing this objective, inspect `CALayer.presentationLayer` on the
main thread just before native start, just after animation installation, and at
the interruption point. Record presentation and model values
for opacity, position, bounds, and transform. This can help distinguish:

- an animation that exists but starts from the opacity-zero workaround or the
  wrong geometry,
- an animation whose presentation never became visible because mounting won
  the ordering race, and
- an overlapping exit that should begin from or coexist with the currently
  visible layout presentation.

Presentation-layer sampling is diagnostic here and becomes an input to the
Objective 09 retargeting algorithm. It is transient and can be unavailable
before the layer is rendered. Do not use it as the authoritative final state or
as a substitute for mounting final Fabric props and layout metrics. In
particular, copying presentation opacity or geometry into the model layer would
hide the mounting defect instead of solving it.

## Target flow: layout transition

```text
Fabric Update(oldView -> finalView)
  -> layout proxy captures old frame/presentation metadata
  -> proxy allows final Update mutation into mounting transaction
  -> native component view mounts final props + layout metrics
  -> post-mount hook resolves final native target
  -> executor animates presentation from old appearance to final model
  -> completion removes explicit animation only
```

## Target flow: entering

```text
Create + Insert final view
  -> mount final props/layout
  -> before first visible commit if possible, install explicit animation with
     backwards fill or an initial presentation transform/opacity
  -> animate to final model
```

The existing temporary opacity-zero mutation must be re-evaluated. If retained,
there must be an actual final Fabric update restoring opacity; a direct layer
write is not enough.

## Target flow: exiting

```text
Remove/Delete arrives
  -> proxy retains mounted view as today
  -> model remains the valid pre-removal state
  -> executor animates presentation toward exit values
  -> completion schedules cleanup for the correct SurfaceId
  -> deferred Remove/Delete mounts
```

## Post-mount synchronization options

### Temporary workaround in the current PoC

The current PoC uses one main-queue turn for entering animations. This restores
the behavior of the first Core Animation PoC: it creates the descriptor during
the mounting transaction and queues the native view lookup once. In the normal
Fabric order, the Insert mutation mounts the view before that queued lookup.

This is a minimal workaround, not a retry policy and not the target design. It
does not retry when the view is missing. It also does not identify a surface or
a mounting transaction. Keep it only while the descriptor-based PoC is under
development. Replace it with option B or C when this objective is implemented.

### A. `dispatch_async(main)` and assume mounting wins

The current PoC temporarily uses this option for entering animations. It is not
recommended for the final implementation. Queue order is an implementation
accident and becomes fragile with multiple surfaces or different RN versions.

### B. `RCTSurfacePresenterObserver` `didMountComponentsWithRootTag`

Practical iOS MVP. Queue pending starts per surface and drain them after mount.
It identifies the surface but not a specific transaction, so use generations
and verify the mounted view's expected final state.

### C. Mounting transaction observer / explicit post-mount integration

This gives the best synchronization if Reanimated can register at the correct
level and associate pending commands with a transaction number.

### D. Encode an animation command in the mutation stream

This gives the most deterministic behavior in theory, but it needs a much
larger React Native integration and is harder to keep portable.

Recommended: start with B or C after inspecting supported RN versions. Prefer C
when it can be implemented without invasive upstream patches.

## Pending-start record

```cpp
struct PendingNativeLayoutStart {
  NativeAnimationHandle handle;
  MountingTransaction::Number transactionNumber;
  LayoutAnimationType type;
  ShadowView oldView;
  ShadowView finalView;
  NativeAnimationPlan plan;
};
```

Before starting after mount:

1. Confirm generation is current.
2. Confirm the view is mounted for the expected surface/tag.
3. Confirm its final layout matches the pending final view.
4. Resolve presentation start if this is an interruption.
5. Schedule the plan or fall back/reject deterministically.

## Interaction policy

Recommended MVP: hit testing and accessibility use final mounted geometry while
pixels interpolate. Document this explicitly; it is a consequence of
compositor-driven final-state-first animations.

## Tests

- During a long layout animation, native component layout metrics are already
  final.
- A child Text/Image/background/border layer has final geometry while the
  parent presentation animates.
- A prop-only React update during the animation does not snap back to old
  layout.
- A second layout commit retargets from current presentation but mounts the
  newest final layout.
- Entering has no one-frame final-state flash, including delayed animations.
- Exiting deletes promptly after completion with no unrelated commit.
- Multiple surfaces cannot drain one another's pending starts.
- `SlideInLeft` is visible throughout its entering motion and does not inherit
  a permanent opacity-zero mount update.
- `FadeIn` interpolates visibly instead of waiting blank and appearing only at
  completion.
- **Exit during layout** visibly preserves the in-flight layout presentation
  while the exit animation begins.

## How to test at this stage

Use the iOS Simulator procedure in [TESTING-GUIDE.md](TESTING-GUIDE.md) and add
a **Final-state-first** group to the test bench.

1. **Layout:** move a tappable view from frame A to non-overlapping frame B over
   five seconds. At native animation start and at 50%, record the native view
   frame, layer model position/bounds/transform, and layer presentation values.
   Assert that view/model geometry already represents B while presentation is
   between A and B. Programmatic hit testing must follow Objective 03's policy.
2. **Entering with one-second delay:** insert at final frame B. During the
   delay, assert no visible final-state flash while mounted view/model state is
   B. At completion, assert presentation and model converge and the callback
   fires once with `finished=true`.
3. **Exiting:** remove a child with a five-second exit. Assert the retained view
   remains resolvable during the exit. After the terminal event, assert one
   cleanup mutation for the same surface and that native lookup no longer
   returns the view.
4. **Post-mount race:** pause just before the selected post-mount callback,
   delete the view or start a newer generation, then resume. Assert no CA key is
   added for the missing/stale target and exactly one rejected/cancelled event
   is emitted.
5. **Back-to-back commits:** send A→B and B→C before the first platform start.
   Assert mounted/model state is C and no stale callback resets it to A or B.
6. Run all five cases three times on legacy and native. Compare first visible
   presentation, final model, terminal events, and callback count. Attach traces
   and a video of delayed entering to the PR.
7. Run common tests, Apple lint, and common-app type checking from the testing
   guide.

Use the simulator to test the ordering contract. Use a physical device
only if the chosen mount hook demonstrably behaves differently there;
performance remains out of scope.

## Acceptance criteria

- Layout Update mutations are no longer replaced by direct model-layer state as
  the authoritative state.
- Host layout and props match the latest Shadow Tree during animation.
- Native start is explicitly ordered after the intended mount.
- Entering/exiting lifecycle remains correct.
- The design works conceptually on Android without an iOS-only ordering
  assumption.

## References

- [Legacy mutation proxy](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp)
- [React Native component layout update](../../node_modules/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm)
- [Surface presenter observer example](../../packages/react-native-reanimated/apple/reanimated/apple/pseudoSelectors/REAPseudoSelectorAttachQueue.mm)
- [Core Animation explicit animation model](../core-animation/04-animating-layer-content.md)

## Next objective

[Objective 07 — Build the Native Animation IR and Capability Routing](07-native-ir-and-capability-routing.md).
