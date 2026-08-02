# Objective 15 — Measure Performance and Fidelity

## Goal

Show where the native backend is faster, measure setup costs, and measure
visual/semantic fidelity before expanding routing.

## Depends on

- Objective 01 baseline harness and the initial post-Objective-02 corpus.
- At least Objective 08 timing MVP.
- Re-run after Objectives 10, 12, 13, and 14 as those paths land.

## Concurrency

**Parallel-safe and incremental.** Use the initial post-Objective-02 corpus as
the behavioral reference point. If Objective 08 has not landed yet, add the
performance runs for that same commit; otherwise record the omission rather
than presenting a later commit as a pre-08 measurement. Measure each native
slice after its own acceptance gate, and continue
while later features are implemented. Do not publish final conclusions until
all routes claimed for rollout have been remeasured on the required devices.

## Performance hypothesis

The native backend trades one-time compilation/setup work for removal of
per-frame Reanimated/Fabric updates.

```text
Legacy cost
  = animation setup
  + UI-runtime work every frame
  + update batching/props/layout mutations every frame
  + mounting work every frame

Native cost
  = plan compilation
  + JSI/native plan transfer
  + platform animation creation
  + compositor/native animation execution
  + terminal cleanup
```

Measure both sides. Do not assume that Core Animation gives an improvement.

## Fast-path experiment and validation

Recent implementation experiments indicate this expected ordering for simple
eligible animations:

```text
platform simple-animation fast path > descriptor/keyframe native path > legacy
```

Here “>” means lower measured setup and/or runtime cost, not a semantic
guarantee. Validate that result separately for the simple route, structured
native route, and legacy route using identical resolved inputs. Record route
selection, eligibility/rejection reason, descriptor/keyframe count, platform
animation count, and all normal startup/frame/fidelity metrics. Do not treat a
known builder name as a benchmark route; equivalent resolved custom graphs must
be included to verify the fast path is structural rather than preset-based.

## Metrics

### Startup

- time from Fabric commit detection to plan ready;
- plan compilation time;
- time crossing JSI/C++ boundary;
- main-thread platform setup time;
- time from commit to first correct animated presentation frame;
- allocated objects/bytes and plan payload size.

### During animation

- JS/UI-runtime frame work;
- main-thread CPU;
- compositor/render-server behavior;
- dropped frames at 60 Hz and 120 Hz;
- Fabric commits/mounting transactions caused by the animation;
- memory retained by active animations;
- energy impact for long/repeated scenarios.

### Completion

- terminal callback latency;
- exiting removal latency;
- cleanup work and registry lifetime.

### Fidelity

- value error over time against the legacy oracle;
- first/final frame correctness;
- transform projected-corner error;
- duration and callback-time error;
- interruption position/velocity discontinuity;
- component-specific visual artifacts during size changes.

## Benchmark scenarios

1. One simple `LinearTransition`.
2. 20, 100, and 500 simultaneous position transitions.
3. Position and size with nested content.
4. Fade/Slide entering and exiting list items.
5. Continuous interruption/retargeting.
6. Complex sampled Bounce/LightSpeed/Flip cases.
7. Spring subset if Objective 13 accepts one.
8. Concurrent CSS transition and layout activity.
9. React navigation/screen layer with modified ancestor timing.
10. Reduced motion and immediate completion.

## Tooling

- Release builds only for final comparisons.
- Instruments Time Profiler and Core Animation-related instruments on iOS.
- `os_signpost`/Reanimated tracing around compilation, mount, platform schedule,
  first frame, and completion.
- Xcode memory tooling for retained CA animations/delegates.
- Android Perfetto/System Trace and frame metrics for the portability spike.
- Objective 01 structured lifecycle/value traces, initially captured at the
  post-Objective-02 state, for fidelity.

## Sampling optimization order

If sampled-plan setup is too slow:

1. Confirm structural lowering is being used for simple cases.
2. Simplify curves while respecting error tolerances.
3. Avoid iOS re-resampling.
4. Pack numeric payloads into typed buffers.
5. Cache stable compiled structure where runtime values allow it.
6. Only then consider changing internal sample resolution.

Do not start by increasing from 60 to 120 samples per second. That doubles
setup data without addressing architecture.

## Performance budgets

Agree on budgets with maintainers before declaring victory. Example categories:

- Maximum added main-thread setup per view.
- Maximum batch setup for 100 simultaneous animations.
- Maximum first-frame latency.
- Maximum sampled plan size/duration.
- Required reduction in per-frame UI-runtime/mounting work.
- Allowed fidelity error by target type.

The specific numbers should come from representative devices and product
expectations, not this document.

## Core Animation performance cautions

- `shouldRasterize` is not a universal optimization; dynamic size/scale can
  cause re-rasterization or blurry content.
- Animating shadows without a suitable shadow path can use many resources.
- Bounds changes can trigger redraw or private sublayer work.
- Large keyframe arrays still have setup and memory costs.
- Debug slow-animation coefficients must not contaminate real timing results.

## How to test at this stage

Final performance evidence requires physical devices and Release builds. The
Simulator may only be used to debug signposts and benchmark controls.

1. Freeze each benchmark's input, duration, view count, repetition count, and
   route. Add a warm-up run, then collect at least 10 measured runs for legacy
   and 10 for native in alternating order. Verify the visible route label and
   save the structured trace for every run.
2. Test one older supported iPhone and one 120 Hz iPhone. Record model, iOS
   version, refresh-rate setting, build SHA, thermal state, and whether Low
   Power Mode is on. Use Release, disconnect the debugger when possible, and
   disable sanitizers, screen recording, and slow animations.
3. In Xcode choose **Product > Profile**, select **Time Profiler**, and record
   the 1-, 20-, 100-, and 500-view position scenarios. Use the signpost intervals
   for compile, mount, platform schedule, first frame, completion, and cleanup.
   Export the Instruments trace.
4. Record a Core Animation/frame-pacing trace for position, FLIP with Text,
   sampled Bounce, and continuous retargeting. Report main-thread CPU,
   UI-runtime work, dropped/hitched frames, first-frame latency, render-server
   behavior, and animation-caused Fabric mount count.
5. Use Allocations/Leaks or Xcode's memory graph after 100 repeated
   start/cancel/exit cycles. Assert active-handle, delegate, retained-view, and
   CA-animation counts return to baseline after the final cleanup.
6. At programmed checkpoints, compare native and legacy traces for opacity,
   position, projected matrix corners, duration, callback time, and first/final
   state. Classify every out-of-budget difference using the testing guide.
7. For Android, run the same supported subset on a physical device and capture
   Android Studio **Profiler > System Trace** or Perfetto. Separate UI-thread
   `ValueAnimator` work from render-thread/platform animation work.
8. Publish medians plus spread/percentiles, raw data, trace links, and routing
   counts. Do not average away cold-start or tail latency. Have maintainers set
   explicit budgets in `DECISION-LOG.md` before calling a route faster enough.

The objective passes only when the supported rollout subset meets its agreed
budgets on both required iPhones and any claimed Android route has device data.

## Acceptance criteria

- Benchmarks compare legacy and native in identical scenarios and release
  builds.
- Startup, steady-state, completion, memory, and fidelity are all reported.
- Results distinguish primitive plans from sampled fallback plans.
- Supported-subset expansion is driven by data.
- Any accepted fidelity difference is recorded in the decision log.
- Results include at least one older supported iPhone and one 120 Hz device.

## References

- [Core Animation performance guide](../core-animation/08-improving-animation-performance.md)
- [Existing native animation summary](../reanimated-native-animations/css-and-layout-core-animation-summary.md)
- [Baseline objective](01-establish-behavioral-baseline.md)

## Next objective

[Objective 16 — Production Hardening and Rollout](16-production-hardening-and-rollout.md).
