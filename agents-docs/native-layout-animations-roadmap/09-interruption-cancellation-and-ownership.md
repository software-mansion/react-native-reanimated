# Objective 09 — Implement Ownership, Interruption, and Cancellation

## Goal

Make native animations deterministic when replaced, cancelled, unmounted, or
targeted concurrently by different Reanimated systems.

## Depends on

- Objective 08 iOS executor.
- Ownership decisions from Objective 04.

## Concurrency

**Sequential blocker for lifecycle code.** The CSS ownership discussion and
test-case design may run while Objective 08 is finishing, but implementation
starts only after the basic executor is stable. Objective 15 may measure the
uninterrupted Objective 08 subset in parallel; it must not measure replacement
claims until this objective passes.

## Why this is separate from basic playback

Starting a CA animation is easy. Correctly stopping or replacing a logical
animation while preserving Fabric, callbacks, and other animation owners is
the difficult part.

## Current behavior to replace

```text
new layout animation
  -> inspect presentation layer only if a same-key CA animation exists
  -> replace first sampled value
  -> remaining samples retain old trajectory

cancel
  -> JS stop(tag)
  -> native animation may continue

CSS and layout both target opacity/transform
  -> separate keys and state machines
  -> no explicit arbitration contract
```

## Target executor registry

Main-thread-owned conceptual structure:

```cpp
struct ActiveNativeAnimation {
  NativeAnimationHandle handle;
  std::unordered_map<NativeAnimationTarget, PlatformAnimationKeys> keys;
  Completion completion;
  bool terminalEventSent;
};

std::unordered_map<HandleKey, ActiveNativeAnimation> activeByHandle;
std::unordered_map<TargetKey, NativeAnimationHandle> ownerByTarget;
```

`TargetKey` should include surface, tag, and target.

Generation is logical execution identity, not a blanket per-tag lock. Starting
an exit generation must not cancel an in-flight layout generation merely
because both address the same view. Use `ownerByTarget` to distinguish:

```text
layout generation 7 owns position/bounds
exit generation 8 owns opacity
  -> both continue

layout generation 7 owns position
exit generation 8 also requests position
  -> apply the accepted conflict/interruption rule for position
```

This preserves the legacy manager's property-map merging behavior and the
preset-era CA implementation's reason for using separately keyed animations
instead of one `CAAnimationGroup`.

When only part of an old logical plan is preempted, complete its public callback
once with `finished=false`. Preserve unaffected visual motion by transferring
or recompiling surviving tracks under the new logical generation. Do not keep
the old callback pending merely because one physical track continues. Confirm
the precise event order against Objective 03 traces before freezing this rule.

Objective 02 deliberately stops at current physical-key-path ownership:
`opacity`, `position`, `bounds.size`, and `transform`. Thus opacity and position
can coexist, but X/Y are not independently owned while the Apple player emits a
single `position` (`CGPoint`) animation.

## Interruption algorithm

```text
schedule new generation
  -> determine target conflicts
  -> capture required presentation values on platform thread
  -> mark old logical handle interrupted
  -> remove only old owner's animation keys
  -> compile/adjust new start state
  -> add new animations
  -> deliver old completion(false) once
```

### Continuity levels

1. Position continuity: no visible jump.
2. Velocity continuity: motion direction/speed remains smooth.
3. Full curve continuity: new semantic curve begins from correct state.

Recommended MVP: position continuity for timing animations. Add velocity
continuity only when the IR and primitive expose enough information.

Do not claim spring continuity by replacing only the first keyframe.

## Cancellation dispositions

### SettleToCommittedModel

Remove explicit animations. The already-correct Fabric model becomes visible.
Use for disabling/removing a normal layout animation.

### PreservePresentationForRetarget

Capture presentation, remove old animations, and immediately use that value as
the next plan's start. Do not leave frozen model values indefinitely.

### RemoveRetainedView

Terminate an exit lifecycle and request the deferred Remove/Delete.

## Cross-owner arbitration

This objective must be reviewed with the CSS maintainer even if CSS code remains
unchanged.

Questions:

- Does layout own geometry while CSS owns visual props?
- If both own opacity/transform, does newest command win, do priorities apply,
  or must one route to legacy?
- Can owners compose transforms safely?
- Which owner is notified when another owner preempts it?

Recommended conservative MVP:

- Geometry targets are layout-owned.
- If another native owner already owns the exact visual target, layout falls
  back rather than composing implicitly.
- Every preemption is observable and completes the old owner with a reason.

## Stale asynchronous work

At every asynchronous boundary:

```cpp
if (!registry.isCurrent(handle)) {
  return; // never start or complete a stale generation as current
}
```

Also validate that the resolved native view belongs to the expected surface
and current mount lifetime.

## Tests

- Timing animation retargets without a position jump.
- Old callback receives `false`; new callback eventually receives `true`.
- Cancellation before start creates no CA animation.
- Cancellation after start removes all owned keys and no foreign keys.
- Two tracks ending/replacing independently still produce one logical
  completion.
- View unmount/recycle cannot receive a stale animation.
- CSS/layout target conflict follows the agreed conservative rule.
- Exit cancellation cannot leak a retained view.
- Start a long layout position animation, then begin `FadeOut` at 40%. Assert
  position presentation continues without a jump while opacity decreases. The
  exit must not preempt geometry solely because it has a newer generation.
- Repeat with an exit that also owns position and assert the documented
  same-target conflict rule instead of implicit whole-tag cancellation.
- Start a plan owning PositionX and PositionY, then replace only PositionY.
  Assert the old logical callback fires once with `false`, PositionX has no
  presentation jump, and its surviving trajectory is owned by the new logical
  generation rather than keeping the old callback alive.

## How to test at this stage

Use the deterministic controls in **[LA] Native backend test bench**. Do not use manual
tap timing for interruption checks.

1. Run a five-second A→B position animation. At exactly 40% schedule B→C.
   Capture presentation immediately before removal and immediately after the
   new key is installed. Assert the visual-position delta is within Objective
   03's tolerance, old callback is called once with `false`, and new callback
   once with `true`.
2. Repeat replacement at 0%, 1%, 50%, 99%, and after natural completion, 20
   times each. Assert one terminal event per generation and no active registry
   entry or owned CA key after every sequence.
3. Add an unrelated CA key and, if available without CSS source edits, a CSS
   animation on another target. Cancel layout before start and at 50%. Assert
   only keys recorded under the layout handle are removed.
4. Execute the four CSS/layout conflict sequences accepted in Objective 04 in
   a fake-executor integration test. For any sequence currently executable in
   FabricExample, have the CSS maintainer run or review the trace. The observed
   owner, fallback/preemption reason, and callbacks must match the RFC; do not
   change CSS implementation in this objective.
5. Start an exit, cancel it at 40%, and run forced screen cleanup. Assert the
   retained native view disappears, one cleanup is requested on the correct
   surface, and no callback or stale start arrives afterward.
6. Run **[LA] Interrupted exiting animation (#7493)** and **[LA] Exiting tag
   reuse stress** for 100 cycles under AddressSanitizer using
   [TESTING-GUIDE.md](TESTING-GUIDE.md).
7. Run common lifecycle tests, Apple lint, and common-app type checking. Attach
   the 40% replacement trace and a slow five-second video to the PR.

The simulator tests are enough. A physical-device smoke test is recommended
for presentation continuity. Objective 15 measures smoothness.

## Acceptance criteria

- Native cancel no longer routes through a JS mutable that does not exist.
- Every handle has exactly one terminal event.
- Presentation is read only on the platform thread and never mutated.
- Namespaced removal cannot delete third-party or other Reanimated animations.
- Cross-owner behavior is documented and reviewed by the CSS owner.
- Post-Objective-02 interruption traces captured with the Objective 01 harness
  pass for the supported subset.

## References

- [Presentation-layer rules](../core-animation/02-core-animation-basics.md)
- [Stopping explicit animations](../core-animation/04-animating-layer-content.md)
- [Current CSS interruption logic](../../packages/react-native-reanimated/apple/reanimated/apple/CSS/REACSSPlatformTransitions.mm)
- [Current layout cancel call](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp)

## Next objective

[Objective 10 — Implement Geometry, Transforms, and Size Changes](10-geometry-transforms-and-size.md).
