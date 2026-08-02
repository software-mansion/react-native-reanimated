# Objective 05 — Introduce Platform-Neutral Interfaces

## Goal

Add the common types and executor contracts from Objective 04, then adapt
the layout PoC to them without migrating CSS.

## Depends on

- Accepted Objective 04 RFC.

## Concurrency

**Sequential blocker for the shared headers.** Do not create the interface
before Objective 04 sign-off. After the common types are frozen in this
objective, an Android owner may begin Objective 14's compile-only adapter in
parallel; Objective 06 may begin only after the fake-executor tests pass.

## Design rules

The common interface must not contain:

- `CALayer`, `CAAnimation`, Objective-C objects, or Core Animation key paths;
- Android `View`, property names, density conversions, or JNI containers;
- layout preset names;
- CSS reversal or pseudo-selector state;
- JSI values with a lifetime extending past the UI-runtime call.

## Proposed common shape

Names are illustrative; follow the accepted RFC.

```cpp
enum class NativeAnimationOwner {
  Layout,
  CSSTransition,
  CSSAnimation,
};

struct NativeAnimationHandle {
  SurfaceId surfaceId;
  Tag tag;
  NativeAnimationOwner owner;
  uint64_t generation;
};

enum class NativeAnimationTarget {
  Opacity,
  Position,
  BoundsSize,
  TransformMatrix,
};

enum class CancelDisposition {
  SettleToCommittedModel,
  PreservePresentationForRetarget,
  RemoveRetainedView,
};

class NativeAnimationExecutor {
 public:
  virtual ~NativeAnimationExecutor() = default;

  virtual CapabilityReport queryCapabilities(
      const NativeAnimationPlan &plan) const = 0;

  virtual void schedule(
      NativeAnimationHandle handle,
      NativeAnimationPlan plan,
      Completion completion) = 0;

  virtual void cancel(
      NativeAnimationHandle handle,
      CancelDisposition disposition) = 0;
};
```

At this stage, `NativeAnimationPlan` may wrap the current descriptor. Objective
07 will replace it with the proper IR.

Objective 02's temporary `NativeLayoutAnimationHandle { tag, generation }` is
the migration source for this type. Do not move its generation into the
descriptor while adapting the PoC; add surface and owner identity to the
handle instead.

## Current versus target

```text
CURRENT
LayoutAnimationsManager
  -> RunNativeLayoutAnimation std::function
  -> platform method with layout-specific descriptor
```

```text
TARGET
LayoutAnimationsManager
  -> layout-owned request/lifecycle adapter
  -> NativeAnimationExecutor interface
  -> iOS/Android platform adapter
```

## Recommended file organization

Exact placement requires Objective 04 agreement. A plausible structure:

```text
Common/cpp/reanimated/NativeAnimations/
  NativeAnimationHandle.h
  NativeAnimationPlan.h
  NativeAnimationTarget.h
  NativeAnimationExecutor.h
  NativeAnimationCapabilities.h

apple/reanimated/apple/NativeAnimations/
  REANativeAnimationExecutor.h
  REANativeAnimationExecutor.mm

android/.../nativeAnimations/
  NativeAnimationExecutor.kt
```

Keep `LayoutAnimationsManager` responsible for translating layout lifecycle
events into executor commands.

## Thread and ownership contract

Document directly above the interface:

- Common callers may invoke from Reanimated's UI thread.
- The platform implementation owns the plan after `schedule` is called.
- The platform implementation posts to the main/UI thread internally.
- Completion may originate on the platform UI thread but must be delivered to
  the owner-provided scheduler before owner state is touched.
- The executor never stores JSI objects.
- Plans are immutable after schedule.

## Alternatives

### Interface implemented directly by Objective-C++/JNI functions

Smallest diff, but continues growing `PlatformDepMethodsHolder` into an
unstructured list of callbacks.

### C++ abstract executor with platform adapters — recommended

Gives iOS and Android one contract and is mockable in unit tests.

### HostObject/JS-owned executor

Not recommended for layout MVP. It moves lifecycle and threading back across
JSI, where the native backend is trying to avoid per-frame work and complex
ownership.

## Step-by-step work

1. Add common identity, target, result, and cancellation types.
2. Add an executor interface with explicit ownership documentation.
3. Add a fake executor for C++ unit tests.
4. Wrap the current iOS and Android callbacks in adapters.
5. Change layout code to depend on the interface, not platform callbacks.
6. Keep legacy layout execution unchanged.
7. Do not migrate or include CSS registries in the PR.
8. Ask the CSS maintainer to review only the public common types for future
   compatibility.

## Tests

- Fake executor receives an owned plan after caller locals are destroyed.
- Completion is ignored for stale generations.
- Staleness is evaluated against declared target ownership, not the numerically
  newest generation for the entire tag. The fake executor must allow an older
  geometry handle and newer opacity handle to remain current together.
- Cancel passes the requested disposition.
- Capability rejection does not schedule.
- Executor destruction or missing platform implementation cannot strand an
  exiting animation.

## How to test at this stage

This objective proves type boundaries and command lifecycle, not animation
fidelity.

1. Add a common C++ fake executor that records `schedule`, `cancel`, capability
   queries, and completion delivery. Run table-driven tests for natural
   completion, cancellation before schedule, replacement by a new generation,
   missing target, unsupported capability, and duplicate platform completion.
   Each handle must produce exactly one logical terminal event.
2. Compile the same plan fixture into an Apple adapter stub and an Android
   adapter stub. The common fixture should need no `#ifdef` and contain no
   Objective-C, JNI, `CALayer`, CA key path, `View`, `ValueAnimator`, or
   platform-clock value.
3. Destroy the caller's plan immediately after `schedule` in the fake test; the
   executor's recorded owned copy must remain valid. Also assert that the plan
   and completion payload contain no JSI runtime object.
4. Run two surfaces that reuse the same tag and two owners on the same target.
   Assert that `(surface, tag, owner, generation)` keeps the handles distinct
   and owner-scoped cancellation leaves the other owner untouched.
5. Run the repository test and both native lint commands from
   [TESTING-GUIDE.md](TESTING-GUIDE.md). If no common C++ unit target exists in
   this branch, add the tests to the native test target agreed in the RFC and
   record its exact local/CI invocation here before merging.
6. Build and launch FabricExample once on iOS Simulator with both flag values.
   Existing **[LA] Basic layout animation** must still run; the interface
   skeleton must not change routing or visuals.

No physical device is required. Pass requires fake-executor lifecycle coverage,
both platform stubs compiling, and a no-behavior-change iOS smoke test.

## Acceptance criteria

- Layout native execution goes through a named platform-neutral interface.
- Common headers compile for both iOS and Android.
- No common type contains platform key paths or objects.
- This work does not change the current CSS implementation.
- A fake executor can test layout lifecycle without UIKit or Android runtime.

## References

- [Current PlatformDepMethodsHolder](../../packages/react-native-reanimated/Common/cpp/reanimated/Tools/PlatformDepMethodsHolder.h)
- [Current native layout descriptor](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h)
- [Apple platform adapter construction](../../packages/react-native-reanimated/apple/reanimated/apple/native/PlatformDepMethodsHolderImpl.mm)
- [Android native proxy](../../packages/react-native-reanimated/android/src/main/cpp/reanimated/android/NativeProxy.cpp)

## Next objective

[Objective 06 — Implement Final-State-First Mounting](06-final-state-first-mounting.md).
