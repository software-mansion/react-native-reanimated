# Objective 01 — Establish the Behavioral Baseline

## Goal

Create a repeatable method to observe and compare the current legacy layout
backend and the experimental native backend. The harness and instrumentation
were complete before Objective 02, but the team did not capture the first
durable trace then. The project's first recorded baseline must be
captured from the completed Objective 02 stabilization state.

This work protects later changes and teaches you about the layout lifecycle.

## Why this comes first

Without a baseline, a visually plausible native result can hide broken
callbacks, stale host layout, delayed deletion, transform-order changes, or
interruption discontinuities. The legacy backend is the initial behavioral
oracle.

## Prerequisites

- Read [GLOSSARY.md](GLOSSARY.md): Fabric, mutation, host state, presentation
  layer, semantic parity, and oracle.
- Build and run the Fabric example app once without changing feature flags.

## Concurrency

**Retrospective checkpoint.** The harness/schema portion was completed before
Objective 02, but its measurement/evidence portion was not. Do not reconstruct
or label pre-Objective-02 behavior as measured evidence. Capture both backends
now from the completed Objective 02 state before Objective 03 freezes semantic
contracts or later objectives change behavior again.

## Learn before coding

Trace these paths with a debugger or temporary logs:

- Configuration: [UpdateLayoutAnimations.native.ts](../../packages/react-native-reanimated/src/UpdateLayoutAnimations.native.ts)
- JS manager: [animationsManager.ts](../../packages/react-native-reanimated/src/layoutReanimation/animationsManager.ts)
- Mutation interception: [LayoutAnimationsProxy_Legacy.cpp](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp)
- Progress/completion bridge: [ReanimatedModuleProxy.cpp](../../packages/react-native-reanimated/Common/cpp/reanimated/NativeModules/ReanimatedModuleProxy.cpp)
- Existing interruption example: [InterruptedLayoutAnimationsExample.tsx](../../apps/common-app/src/apps/reanimated/examples/InterruptedLayoutAnimationsExample.tsx)

## Current situation

```text
Run example manually
  -> decide whether it "looks right"
  -> change implementation
  -> run again
  -> no durable evidence of timing, callbacks, or host state
```

## Target situation

```text
Choose scenario + backend flag
  -> record lifecycle events and selected presentation/model values
  -> optionally record screenshots/video
  -> compare legacy and native traces
  -> classify each difference as bug, accepted difference, or unsupported case
```

## Recommended implementation

Build a development-only layout-animation test screen and trace recorder. Do
not build a general testing framework yet.

Record at least:

- tag, surface, animation type, and generation;
- mutation type and old/new frames;
- animation start request time;
- post-mount/native start time;
- completion time and `finished` value;
- user callback invocation;
- exiting Remove/Delete time;
- model and presentation values for opacity, position, bounds, and transform;
- native-view hit-test/accessibility frame when relevant.

Use deterministic durations. Do not use random delays in baseline scenarios.

Each bench action is a self-contained deterministic mode. A reset must not
unmount a keyed scenario subtree carrying `exiting`, because that manufactures
an exit animation unrelated to the scenario. Reset layout changes are applied
with layout animation disabled, and action controls cannot start a second run
while one is active. In particular, **Run + interrupt** means “reset, start,
then interrupt at the fixed offset”; it is not a button to press during **Run
uninterrupted**.

## Required scenarios

1. `LinearTransition` position only.
2. Position and size change with text inside.
3. `FadeIn` and `FadeOut`.
4. `SlideInLeft` and `SlideOutRight`.
5. Entering interrupted by layout.
6. Layout interrupted by another layout.
7. Exiting while a layout animation is active.
8. Cancellation before the scheduled native start runs.
9. Parent removal with animated children and view flattening.
10. Reduced motion.
11. A custom animation containing an unsupported style property.
12. A transform-order-sensitive animation.

## Alternatives

### A. Runtime-test-only harness

Pros: automatable from the start.  
Cons: harder to inspect Core Animation presentation values and native host
state.

### B. Example-screen-only harness

Pros: fastest for learning and native inspection.  
Cons: weak regression protection.

### C. Combined approach — recommended

Start with the example screen and structured logs. Promote stable cases into
runtime/native tests as the architecture settles.

## Step-by-step work

1. Add a visible compiled-backend label and use the existing static flag/build
   configuration to select the backend. Do not present it as a runtime toggle.
2. Extend the interruption example or create a dedicated native-layout test
   screen.
3. Define a common event schema for trace messages.
4. Instrument legacy start/progress/end without changing behavior.
5. Instrument native descriptor creation and platform start/end.
6. Add explicit user callbacks that record `finished`.
7. Add a way to repeat a scenario with identical timing.
8. Save one legacy and one native trace per required scenario from the
   post-Objective-02 capture point.
9. Document which legacy behaviors are intentional versus historical bugs.

## Acceptance criteria

- Every required scenario can be replayed without editing its source; changing
  the compiled backend still requires the documented static-flag rebuild.
- Legacy and native runs produce comparable structured traces.
- The trace identifies whether completion and removal happened on the correct
  surface.
- At least position, size, opacity, and transform presentation values can be
  inspected on iOS.
- The recorder and harness themselves do not change production behavior.
- Evidence metadata identifies the capture point as post-Objective-02; it does
  not imply that an equivalent pre-Objective-02 run was recorded.

## How to test at this stage

Follow the one-time setup, simulator launch, backend comparison, and evidence
capture instructions in [TESTING-GUIDE.md](TESTING-GUIDE.md).

1. Register the development screen in
   `apps/common-app/src/apps/reanimated/examples/index.ts` with the exact title
   **[LA] Native backend test bench**. Give it the controls and backend label
   required by the testing guide.
2. With `IOS_USE_NATIVE_LAYOUT_ANIMATIONS=false`, rebuild and open the screen.
   For each of the 12 required scenarios: press **Reset**, choose exactly one
   self-contained mode—**Run uninterrupted**, **Run + interrupt**, or **Run +
   cancel**—wait for its terminal event, and copy the trace. Repeat three
   times. Identical inputs must have the same event types, generation changes,
   callback count, and final values; timestamps may differ.
3. Repeat with `IOS_USE_NATIVE_LAYOUT_ANIMATIONS=true`. This run exercises the
   stabilized Objective 02 PoC. Any behavioral failure is post-Objective-02
   baseline evidence, not evidence of the original unstabilized PoC and not a
   reason to weaken the assertion. It must not crash.
4. For interruption scenarios, choose **Run + interrupt**; the bench schedules
   interruption at its fixed programmed time. For pre-start cancellation,
   choose **Run + cancel**; the bench schedules cancellation on the next JS
   task. Do not first start **Run uninterrupted** or tap manually. Verify that
   the trace can tell whether a platform animation was created.
5. Cross-check existing screens **[LA] Interrupted exiting animation (#7493)**,
   **[LA] Exiting tag reuse stress**, **[LA] Reduced Motion**, and **[LA] View
   Flattening**. Record any behavior that the new deterministic scenario does
   not reproduce.
6. Run:

   ```sh
   yarn workspace common-app type:check:native
   yarn workspace fabric-example lint
   ```

7. Capture one screenshot and one video for the position-and-size scenario on
   each backend. Store traces with the commit SHA, simulator/OS, backend,
   scenario input, and `capturePoint: post-objective-02`. The objective passes
   when every scenario is source-edit-free
   and produces a comparable trace, even if the native trace exposes known PoC
   bugs.

A physical device is optional here because this objective establishes behavior,
not performance.

## Deliverables

- Development test screen/harness.
- Initial post-Objective-02 golden traces or a documented procedure for
  producing them. No pre-Objective-02 golden trace is claimed.
- A short list of legacy behaviors that need maintainer confirmation.

## Next objective

[Objective 02 — Stabilize the Existing PoC](02-stabilize-current-poc.md).
