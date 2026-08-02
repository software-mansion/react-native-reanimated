# Objective 07 — Build the Native Animation IR and Capability Routing

## Goal

Use a generic, platform-neutral intermediate representation and an explicit
eligibility decision instead of sampling everything into named scalar channels.

## Depends on

- Objective 05 platform-neutral interface.
- Objective 06 final-state-first lifecycle.

## Concurrency

**Sequential blocker for IR freeze.** Schema drafting may overlap late
Objective 06 after the mount-start contract is stable. Once the IR and
capability result are frozen and pure tests pass, Objective 08 and the
compile-only portion of Objective 14 may proceed in parallel.

## Current representation

```ts
{
  durationMs,
  properties: [
    { keyPath: 'originX', offsets: [...], values: [...] },
    { keyPath: 'scaleX', offsets: [...], values: [...] }
  ]
}
```

Problems:

- `keyPath` mixes canonical names with platform key-path terminology.
- All behavior is already sampled; timing structure is lost.
- transform order is lost when arrays are flattened into scalar channels.
- unsupported styles disappear silently.
- one global duration hides per-track delay and sequence structure.

## Recommended IR

```cpp
using Scalar = double;
using Point = NativePoint;
using Size = NativeSize;
using Matrix4 = NativeMatrix4;
using NativeValue = std::variant<Scalar, Point, Size, Matrix4, NativeColor>;

struct TimingSegment {
  double startMs;
  double endMs;
  NativeValue from;
  NativeValue to;
  TimingFunction easing;
};

struct KeyframeSegment {
  std::vector<double> timesMs;
  std::vector<NativeValue> values;
  std::vector<TimingFunction> segmentEasings;
  InterpolationMode mode;
};

struct NativeAnimationTrack {
  NativeAnimationTarget target;
  std::vector<NativeAnimationSegment> segments;
};

struct NativeAnimationPlan {
  double totalDurationMs;
  std::vector<NativeAnimationTrack> tracks;
};
```

Add spring segments only after Objective 13 decides the semantics. Until then,
spring animations compile to sampled keyframes or fall back.

## Compiler result

Never return only a plan. Return a decision:

```cpp
struct NativeCompilationResult {
  enum class Status { Native, Fallback, Invalid } status;
  std::optional<NativeAnimationPlan> plan;
  FallbackReason reason;
};
```

Example fallback reasons:

- unsupported property;
- unsupported value type;
- transform cannot preserve ordering;
- infinite repeat;
- callback/lifecycle unsupported;
- platform target not available;
- native executor lacks primitive;
- component rendering uses an incompatible private layer.

## Compilation strategy

### Recommended order

1. Run the current layout builder with runtime Yoga values.
2. Inspect/convert the resulting animation graph.
3. Lower known primitives: delay/hold, timing, sequence, and supported
   keyframes.
4. Preserve ordered transforms as full matrix values or ordered operations.
5. Ask the platform executor for capability support.
6. If any required property fails, choose whole-animation fallback.
7. Later, Objective 12 provides sampled-keyframe fallback for compatible
   numeric cases.

### How to expose animation structure

Option A: inspect private fields of `withTiming`/`withSequence` animation
objects. Fastest but brittle.

Option B: add a stable optional native-compilation description to animation
objects. Recommended:

```ts
interface AnimationObject {
  // existing runtime fields
  __nativeAnimation?: NativeAnimationNode;
}
```

Factories construct both their runtime callbacks and a serializable structural
node. Custom animations lacking the node fall back or sample.

Option C: infer named presets from raw config. Not recommended; it recreates
preset-specific native logic.

## Structural fast-path classification

The descriptor/keyframe plan is the general native representation, not the
required playback representation for every eligible animation. Before materializing
keyframes, classify the fully resolved structural graph and lower it to the
cheapest equivalent platform primitive.

```text
resolved descriptor graph
  -> canonical, finite timing track with one value-changing segment
       -> platform simple-animation fast path
  -> canonical finite timing/hold/sequence graph
       -> structured native timing/keyframe plan
  -> deterministic graph that cannot be structurally lowered
       -> Objective 12 sampled-keyframe plan
  -> otherwise
       -> whole-animation legacy fallback
```

This is intentionally a semantic classification, not named-preset detection.
The classifier must derive its result only from the resolved graph, target,
values, timing, and lifecycle requirements. It must not inspect a builder name
or maintain mirrored JS/C++ preset definitions. This lets a simple custom
animation receive the same fast path as a built-in builder when its resolved
structure is equivalent.

Initial fast-path eligibility is deliberately narrow: a supported target and
value type; finite duration; one non-hold timing segment; no per-track callback,
iteration, additive/composite behavior, or continuity requirement that the
primitive cannot preserve. Delay may be represented by the platform start time
when it applies to the entire track. Every rejection records a typed reason and
continues through the next route rather than silently changing behavior.

The current experiment indicates that avoiding descriptor/keyframe materialization
for these simple cases is materially faster than the descriptor path, which is
itself faster than legacy layout animation. Treat this as a routing hypothesis:
Objective 15 must reproduce it on release physical-device benchmarks before
expanding eligibility or making a rollout claim.

## Whole-animation routing recommendation

For MVP:

```text
all required tracks supported -> native plan
any required track unsupported -> whole animation uses legacy backend
```

Do not animate opacity natively while layout runs on the Reanimated loop until
the ownership and clock interaction has dedicated tests.

## Value rules

- Shared geometry is expressed in React Native logical points.
- Platform adapters perform density/platform conversion.
- Angles are radians.
- Transform values preserve all 16 matrix elements.
- Times are relative milliseconds, not platform absolute timestamps.
- Values and times must be finite and validated.

## Tests

- Simple timing builder compiles to one timing segment.
- Equivalent simple built-in and custom structural graphs select the same
  simple-animation route without consulting a preset name.
- A one-segment track selects the simple route; a sequence or per-track hold
  selects the structured/keyframe route with a diagnostic reason.
- Delay plus timing compiles to hold plus timing without dense samples.
- Sequence produces ordered non-overlapping segments.
- Curved transition preserves different per-track timing.
- Transform list order and duplicates are preserved.
- Unknown custom property returns fallback with a reason.
- Infinite repeat returns fallback, not a 20-second “successful” plan.
- The same plan is accepted by fake iOS and Android capabilities.

## How to test at this stage

Test the compiler and router as pure code first; use Simulator only to prove
that the selected route is honored.

1. Build a table-driven matrix covering each supported target/value,
   zero/negative/NaN/infinite duration, unsorted or duplicate offsets,
   mismatched arrays, unknown property, transform order, delay, callback,
   reduced motion, spring, and mixed supported/unsupported properties. Assert
   either a complete `NativeAnimationPlan` or a typed fallback reason—never a
   partial plan.
2. Pretty-print golden plans for timing opacity, position, multi-segment timing,
   and ordered transform. Inspect for relative milliseconds,
   platform-neutral targets, owned values, and explicit owner/generation. No CA
   or Android property name may appear.
3. Fuzz the validator with at least 10,000 malformed numeric/value
   combinations. It must not crash, allocate unbounded memory, or emit a plan
   containing non-finite values. Save the random seed on failure.
4. Add a visible route/reason label to **[LA] Native backend test bench**. Run a
   supported opacity case and a custom case with an unsupported style property.
   With native enabled, assert the first records `native` plus platform
   scheduling and the second records `legacy` plus a stable fallback reason and
   creates no native key.
5. Run mixed opacity plus an unsupported property. Under whole-animation
   fallback, opacity must also stay on the legacy clock; no property may be
   dropped or split.
6. Run the pure tests twice with any randomized seed fixed, then run the common
   repository checks and Apple/Android lint commands in
   [TESTING-GUIDE.md](TESTING-GUIDE.md).

No physical device is required. Pass requires exhaustive declared-input tests
and Simulator traces proving routing occurs before platform execution.

## Acceptance criteria

- Named presets are absent from the compiler and executor.
- Routing distinguishes simple, structured, sampled, and legacy routes and
  exposes a stable reason for the selected non-simple route.
- The IR contains no CA key paths or Android property names.
- Unsupported behavior is never silently removed.
- Basic timing animations compile without sampling.
- Every compilation result has a diagnostic reason.
- Common unit tests cover plan validation and deterministic serialization.

## References

- [Current sampled descriptor](../../packages/react-native-reanimated/src/layoutReanimation/nativeAnimationDescriptor.ts)
- [Animation utilities and composition](../../packages/react-native-reanimated/src/animation/util.ts)
- [Layout builders](../../packages/react-native-reanimated/src/layoutReanimation)
- [Core Animation keyframe timing](../core-animation/04-animating-layer-content.md)

## Next objective

[Objective 08 — Implement the iOS Timing-Track MVP](08-ios-timing-executor-mvp.md).
