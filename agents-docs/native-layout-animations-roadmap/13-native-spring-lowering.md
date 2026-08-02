# Objective 13 — Evaluate and Add Native Springs

## Goal

Determine which Reanimated spring configurations, if any, can use platform
spring primitives without unacceptable semantic differences.

This objective may legitimately conclude that sampled keyframes remain the
correct implementation for some or all springs.

## Depends on

- Objective 07 segment IR.
- Objective 09 interruption semantics.
- Objective 12 sampled fallback.

## Concurrency

**Parallel after checkpoint.** Build the numerical corpus after Objective 07
freezes value/time conventions; this experiment may run beside Objectives
10–12. Adding a `NativeSpringSegment` or enabling routing waits for Objective
09 interruption semantics and Objective 12's proven fallback. A “keep springs
sampled” conclusion does not block Android work.

## Do not assume parameter-name parity

Both Reanimated and Core Animation expose `mass`, `stiffness`, `damping`, and
initial velocity, but parity also depends on:

- the differential equation and units;
- initial-velocity normalization;
- rest/energy threshold;
- duration truncation or stretching;
- overshoot clamping;
- duration-based spring mode;
- damping-ratio mode;
- reduced motion;
- interruption velocity transfer.

`CASpringAnimation.settlingDuration` is an estimate and may differ from its
assigned `duration`.

## Current versus target decision

```text
CURRENT IDEA
spring-like config -> CASpringAnimation because names look similar
```

```text
TARGET
Reanimated spring config
  -> semantic compatibility classifier
      exact/accepted mapping -> NativeSpringSegment
      otherwise -> sampled keyframes or legacy fallback
```

## Recommended experiment

Build a numerical comparison tool, not only a visual example.

For a grid of configurations, record Reanimated values at fixed timestamps and
compare against Core Animation presentation values:

- default physics spring;
- underdamped and overdamped;
- nonzero initial velocity in both directions;
- different distances and value ranges;
- overshoot clamping;
- duration-based spring;
- custom energy threshold;
- interrupted spring retarget.

Compare:

- value error over time;
- peak overshoot;
- zero crossings;
- settling time;
- velocity around interruption;
- callback completion time.

## Possible outcomes

### A. Physics subset maps acceptably

Add:

```cpp
struct NativeSpringSegment {
  double startMs;
  NativeValue from;
  NativeValue to;
  double mass;
  double stiffness;
  double damping;
  double initialVelocity;
  SpringCompletionPolicy completion;
};
```

Use capability flags so Android may map the same segment through its own spring
primitive or reject it.

### B. Visual curve maps but completion differs

Native animation may still be unacceptable because exiting deletion and public
callbacks depend on completion timing. Prefer sampled fallback unless the
difference is explicitly accepted.

### C. No stable mapping — acceptable result

Keep springs sampled or legacy. Document the measurements and avoid a fragile
fast path.

## Newer Core Animation perceptual spring APIs

APIs based on perceptual duration and bounce can help with newly defined
animations, but they do not automatically match Reanimated's current public
spring semantics and may have deployment-version constraints. Treat them as a
separate optional experiment.

## Interruption

If native spring routing is accepted, define velocity transfer precisely.
Reading presentation position is insufficient to recover velocity. Options:

- maintain analytical spring state in the owner;
- derive velocity from native timing/state if a reliable API exists;
- restart without velocity continuity and document the difference;
- use sampled/legacy fallback for interrupted springs.

Recommended MVP: fallback for spring retargeting unless analytical state is
available.

## Tests

- Classifier accepts only configurations covered by the parity experiment.
- Unsupported spring features route before native start.
- Accepted native spring stays within documented error bounds.
- Callback/deletion timing is tested, not only visual value.
- Android capability may reject the spring without changing the common plan.

## How to test at this stage

Treat this as an evidence-gathering objective first and an implementation
objective only if the evidence passes.

1. Define a versioned configuration grid containing default, underdamped,
   critically/overdamped, bidirectional initial velocity, short/long distance,
   overshoot clamping, duration-based, custom threshold, and interrupted
   springs. Use fixed numeric inputs; do not choose examples by eye.
2. For every configuration, sample the Reanimated oracle and the proposed Core
   Animation spring at fixed timestamps plus extrema/zero crossings. Record
   value error, projected error for geometry, peak overshoot, settling time,
   callback time, and velocity around a 40% retarget.
3. Run the Core Animation half of the corpus on iOS Simulator three times and
   one physical iPhone once using **[LA] Native backend test bench**. Sample its
   presentation layer; do not compare only `CASpringAnimation`'s calculated
   duration or model endpoint.
4. Encode the acceptance classifier as table-driven tests. Perturb each
   accepted parameter just inside and outside its supported range and assert a
   deterministic `native-spring` versus `native-sampled`/`legacy` route.
5. For accepted cases, test natural completion, cancellation, exit deletion,
   reduced motion, and 40% interruption. If callback/deletion time or velocity
   exceeds Objective 03's accepted bounds, reject that case even if video looks
   similar.
6. Feed an accepted spring plan to fake Android capabilities that accept and
   reject it. Both outcomes must leave the common plan unchanged and choose the
   declared fallback.
7. Attach the configuration table, raw data, comparison plots or tables, device
   metadata, and classifier decisions. Run common tests, Apple/Android lint for
   shared changes, and common-app type checking from
   [TESTING-GUIDE.md](TESTING-GUIDE.md).

The objective passes either with a narrowly tested native subset or with a
documented decision to keep all springs sampled/legacy. The latter is a valid
technical result, not a test failure.

## Acceptance criteria

- A written compatibility table exists for every public spring mode/modifier.
- Any native fast path is supported by numerical evidence.
- Unsupported springs have a deterministic sampled or legacy fallback.
- The IR remains platform-neutral.
- Completion and interruption differences are explicit.

## References

- [Reanimated spring implementation](../../packages/react-native-reanimated/src/animation/spring/spring.ts)
- [Core Animation timing model](../core-animation/05-advanced-animation-tricks.md)
- Apple `CASpringAnimation` API documentation:
  <https://developer.apple.com/documentation/quartzcore/caspringanimation>

## Next objective

[Objective 14 — Validate the Android Architecture](14-android-portability.md).
