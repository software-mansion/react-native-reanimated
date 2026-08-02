# Objective 02 — Stabilize the Existing PoC

## Goal

Fix the known safety and lifecycle defects that prevent the current native PoC
from being a trustworthy experiment.

This is a stabilization patch, not the final architecture.

## Depends on

- Objective 01 baseline harness and trace schema. Initial durable measurements
  were deferred and are captured after this objective from the stabilized PoC.

## Concurrency

**Completed before initial capture.** Objective 02 was implemented after the
Objective 01 harness existed but before its initial trace corpus was captured.
Do not infer or manufacture a pre-stabilization corpus. Objective 03's contract
table may be drafted after post-Objective-02 traces exist. Do not finalize its
interruption or completion rules until this objective reaches the
“safe-enough PoC” checkpoint: owned async inputs, generation rejection, and a
single terminal-event path are observable.

## Current flow

```text
UI runtime builds local descriptor
  -> passes descriptor by const reference to Objective-C++
  -> Objective-C++ asynchronously captures the reference
  -> local descriptor may be destroyed before main-thread use

CA completion on main thread
  -> directly calls LayoutAnimationsProxy::endLayoutAnimation
  -> returned SurfaceId is discarded
  -> no layout cleanup flush is requested

maybeCancelAnimation(tag)
  -> calls JS LayoutAnimationsManager.stop(tag)
  -> native descriptor path has no JS mutable registered
  -> Core Animation keeps running
```

## Target flow for the stabilization patch

```text
UI runtime builds owned descriptor
  -> ownership safely crosses the main-thread hop
  -> stale generation is rejected
  -> CA starts only for the intended mounted view

CA completion/cancel
  -> posts one completion event through the canonical layout completion path
  -> records the correct SurfaceId for a cleanup pull
  -> invokes the user callback exactly once
```

## Known defects to fix

### 1. Descriptor lifetime

The asynchronous block in [REANodesManager.mm](../../packages/react-native-reanimated/apple/reanimated/apple/REANodesManager.mm)
captures a reference. Restore an owned copy or move an owned
`shared_ptr<const NativeLayoutAnimationDescriptor>` across the asynchronous
boundary.

Recommended:

```cpp
auto ownedPlan =
    std::make_shared<const NativeLayoutAnimationDescriptor>(descriptor);

dispatch_async(mainQueue, ^{
  runOnMain(*ownedPlan);
});
```

Do not capture JSI objects or values for main-thread use.

### 2. Canonical completion routing

Move the work that the `_notifyAboutEnd` host function now does into
a reusable C++ method:

```cpp
void ReanimatedModuleProxy::handleNativeLayoutAnimationCompletion(
    NativeLayoutAnimationHandle handle,
    bool shouldRemove);
```

The manager rejects duplicate terminal events and invokes the stored public
callback once before calling this module hook. The hook should:

1. run on the expected Reanimated/UI thread or use a thread-safe scheduler;
2. call `endLayoutAnimation`;
3. insert the returned surface into `layoutAnimationFlushRequests_`;
4. make sure a render/mount pass is requested.

### 3. Actual native cancellation

Add a temporary platform cancellation function to `PlatformDepMethodsHolder` or
the new shared interface from Objective 05 when available:

```cpp
cancelNativeLayoutAnimation(handle);
```

On iOS it must remove only Reanimated layout animation keys, not all layer
animations. Objective 02 has only settle-to-model cancellation; do not add a
disposition enum until Objective 09 introduces another real behavior.

### 4. Generation tokens

Every start increments a per-tag generation. Pass it alongside descriptor
build and through platform scheduling, cancellation, and completion.

The generation is lifecycle identity, not sampled animation data. For this
stabilization patch, pass a temporary `NativeLayoutAnimationHandle` beside the
descriptor instead of adding `generation` to
`NativeLayoutAnimationDescriptor`. The temporary handle contains `(tag,
generation)` and is replaced by Objective 05's shared `(surface, tag, owner,
generation)` handle after the platform-neutral interface is accepted.

```text
tag 42, generation 7 scheduled
tag 42, generation 8 replaces it
UI-thread manager cancels generation 7 before submitting generation 8
main queue processes generation-7 start/cancel and generation-8 start in order
  -> no stale generation-7 CA key remains
```

This uses the same concept as the Android legacy proxy's
`PendingStart::handle`, generalized across descriptor construction, the Apple
main-thread hop, platform animation keys, cancellation, and completion.

Generation must not be interpreted as “newest animation wins for the entire
tag.” Layout and exit generations can overlap when they own disjoint targets
(for example position plus opacity). Objective 02 may use temporary lifecycle
bookkeeping, but it must not intentionally introduce whole-tag preemption as a
future semantic contract; Objective 09 formalizes per-target arbitration.

For the stabilization patch, use only the physical targets the current Apple
player actually emits:

```text
opacity
position
bounds.size
transform
```

Multiple handles for one tag may remain active when these target sets are
disjoint. A same-target conflict may conservatively interrupt the old whole
logical handle with `finished=false`; partial physical-track transfer is
deferred to Objectives 09 and 10.

Keep the stabilization bookkeeping deliberately small: one per-tag record owns
the next generation and a vector of active handles with their target masks.
Find conflicts by scanning that vector; do not add parallel pending-generation
and target-owner maps. `REANodesManager` is a thin executor and must not mirror
the C++ ownership registry. Starts and cancellations originate on the serial UI
runtime and are submitted to the serial main queue in order; generation-scoped
CA keys make cancellation precise, while the C++ active-vector lookup ignores
late platform completions.

### 5. Validation and missing-view handling

Validate before platform execution:

- descriptor duration is finite and non-negative;
- offsets and values have equal nonzero lengths;
- offsets are finite, ordered, and inside `[0, 1]`;
- values are finite;
- targets are known;
- component view and layer still exist.

Invalid plans must complete/fallback deterministically, not throw across JSI or
leave exiting views retained.

## Alternatives

### Copy the descriptor value

Simplest and recommended for this stabilization objective. The descriptor is
small enough for correctness-first work.

### Keep the descriptor in a native registry

Potentially avoids a copy, but adds ownership and cleanup complexity. Consider
only after Objective 15 proves the copy matters.

### Force synchronous main-thread execution

Not recommended. It risks blocking the UI runtime and creates deadlock or
ordering hazards.

## Public callback strategy

The sampled builder returns `style.callback`, but functions cannot be carried
inside the numeric descriptor. Store the callback on the UI runtime by
`(tag, generation)` and invoke it when native completion is delivered back to
that runtime.

Never call a JSI function directly from the main thread.

## Acceptance criteria

- AddressSanitizer cannot reproduce descriptor lifetime corruption.
- Cancelling before main-thread start prevents CA animation creation.
- Every start has one terminal event: finished, cancelled, rejected, or
  fallback.
- Exiting completion requests cleanup immediately without a later unrelated
  React commit.
- User callback fires exactly once with the correct `finished` flag.
- View disappearance rejects the scheduled start. During a normal Fabric
  renderer lifetime, React tags are allocated monotonically, so same-tag view
  replacement is not treated as an Objective 02 runtime case. Stronger
  `(surface, tag, owner, generation)` identity validation is deferred to
  Objective 05's shared handle.
- Layout geometry and an opacity-only exit can coexist until exit cleanup.
- A same-physical-target replacement terminates the old logical callback once
  with `finished=false`; Objective 02 does not claim scalar X/Y preservation.
- Objective 01 instrumentation remains available for the initial
  post-Objective-02 legacy/native comparison.

## How to test at this stage

Use [TESTING-GUIDE.md](TESTING-GUIDE.md), including its AddressSanitizer steps.
Add these automated checks to the test bench. Do not judge the animation only
by sight.

1. Add a **PoC lifetime/cancellation stress** scenario. Each iteration starts
   an animation, alternates between immediate cancel and replacement, removes
   the view every fifth iteration, and reuses a tag only through normal React
   mounting. Run 100 iterations with `IOS_USE_NATIVE_LAYOUT_ANIMATIONS=true`
   and AddressSanitizer enabled. Pass means zero sanitizer reports, crashes,
   or completion events for the wrong generation.
2. Add a deterministic **cancel-before-main-start** hook that pauses the
   scheduled platform start until the test says continue. Start generation 1,
   cancel it, release the pause, and assert: no CA key was installed,
   generation 1 ended once with `finished=false`, and the view is at committed
   model state.
3. Start generation 1, replace it with generation 2 before the main-thread
   block executes, then release both blocks. Assert that generation 1 is stale,
   only generation 2 owns CA keys, and each generation has exactly one terminal
   event.
4. Run **[LA] Exiting tag reuse stress** for 100 cycles. For each retained exit,
   assert that completion contains the original surface and generation and
   that cleanup occurs without triggering an unrelated React update.
5. Repeat Objective 01's FadeOut and layout-interruption scenarios on legacy
   and native. Compare event order, callback count, `finished`, and cleanup;
   final-state parity remains deferred to Objective 06. These are the initial
   recorded baseline runs, so label them post-Objective-02 rather than treating
   them as a before/after comparison of Objective 02.
6. Run the common-app type check plus the Apple native lint command from the
   testing guide. Rebuild from Xcode with AddressSanitizer once after the CLI
   checks.

Use the simulator for this safety gate. You do not need a physical device
because this test makes no performance conclusion.

## Non-goals

- Correct final Fabric host state; Objective 06 addresses it.
- New IR or performance optimization.
- CSS changes.

## References

- [Current descriptor parsing and start](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsManager.cpp)
- [Current iOS async hop](../../packages/react-native-reanimated/apple/reanimated/apple/REANodesManager.mm)
- [Current cancellation path](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp)
- [Canonical completion bridge](../../packages/react-native-reanimated/Common/cpp/reanimated/NativeModules/ReanimatedModuleProxy.cpp)

## Next objective

[Objective 03 — Define Semantic and Lifecycle Contracts](03-define-semantic-contracts.md).
