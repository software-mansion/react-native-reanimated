# Post-Objective-12 Evidence

## Result

Objective 12 replaces the compatibility sampler with an error-bounded fallback
compiler and sends sampled tracks directly through the typed platform-neutral
IR. Numerical and routing tests, repository checks, and the FabricExample iOS
Simulator build pass.

A fresh app installed and launched, but the bounded Argent execution window
expired before bench navigation. Playback and visual parity are intentionally
not claimed under the roadmap's bounded-validation escape hatch.

## Sampling contract

- Structural lowering remains first. Sampling receives the complete graph only
  when structural lowering cannot represent it.
- Dense stateful evaluation uses a four-millisecond internal step independent
  of 60 Hz or 120 Hz display refresh.
- Known durations and sequence/repeat boundaries are inserted exactly. The
  225 ms fixture ends at 225 ms with its final value.
- There is no semantic maximum duration. A 25-second fixture compiles at its
  declared duration. More than 10,000 dense samples returns explicit
  `sampling-resource-exhausted`; infinite repeat returns `infinite-repeat`.
- Unsupported properties and values route the whole logical animation to
  legacy.
- Transform snapshots are complete ordered Matrix4 values. Simplification uses
  projected-corner error rather than flattening transform operations.
- First, last, and semantic-boundary samples are retained. Scalar and matrix
  curves preserve their original nonuniform millisecond times.
- Apple consumes the typed plan directly in `CAKeyframeAnimation`; the old
  scalar compatibility branch and its uniform 240-point replacement are gone.
- Readable and Float64 packed forms round-trip exactly and reject malformed
  lengths. Runtime JSI packing is deliberately deferred until schema review.

## Numerical and setup evidence

The opaque 900 ms bounce fixture begins with 226 dense samples and simplifies
to 53 Core Animation keyframes within the 0.001 opacity tolerance.

One local Jest-process observation measured:

| Views | Compiler time | Packed bytes | CA keyframes |
| ---: | ---: | ---: | ---: |
| 1 | 1 ms | 904 | 53 |
| 10 | 5 ms | 9,040 | 530 |
| 100 | 45 ms | 90,400 | 5,300 |

These are setup-cost observations, not final Objective 15 performance budgets.

Tests also cover long finite duration, explicit infinite/resource fallback,
opaque sequence boundaries, scalar simplification error, ordered transform
matrices, packed/readable equality, malformed payloads, and whole-animation
unsupported-property fallback.

## Test bench

Scenario 30 adds an opaque bounce animation with rotate-before-translate-before-
scale ordering. It supports normal playback and interruption at 40 percent.
Scenario 11 remains the whole-animation unsupported-property legacy comparison.

## Repository checks

- Full package tests: 95 suites and 1,457 tests passed.
- Layout-reanimation tests: 4 suites and 52 tests passed.
- Native package and common-app typechecks: pass.
- `common-app lint`: zero errors; 208 pre-existing warnings.
- JavaScript, Apple, and Android lint: pass.
- Debug FabricExample iOS Simulator build: pass.

## Validation limits

- The fresh app installed and launched, but the bounded Argent run ended before
  bench navigation.
- No sampled playback, interruption continuity, legacy comparison, visual
  parity, physical-device, or frame-accurate video result is claimed.
- The packed codec is validated in-process; runtime JSI packed transport is not
  claimed.
