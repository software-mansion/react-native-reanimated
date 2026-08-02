# Post-Objective-10 Evidence

## Result

Objective 10 implements ordered transform matrices and final-state-first size
animation on the iOS native path. Pure numerical tests, compiler routing tests,
repository checks, Apple and Android lint, and the FabricExample iOS build pass.

Simulator playback is intentionally not claimed. The installed app identified
the native backend and the geometry scenario was selected and configured, but
the numeric keyboard repeatedly covered the lower controls. The roadmap permits
skipping bounded validation when the harness obstructs progress.

## Transform and geometry contract

- React Native transform operations are multiplied into a complete 4x4 matrix
  in declared order; duplicate operations remain distinct.
- Goldens cover order reversal, duplicate transforms, transform origin, skew,
  perspective, supplied matrices, and FLIP composition.
- Transform-only animations and geometry changes emit complete matrix samples,
  so the platform never reconstructs an unordered transform array.
- Width and height changes mount the final Fabric rectangle first, then present
  the previous rectangle through FLIP.
- Final geometry is plan metadata used by the post-mount queue to verify the
  authoritative mounted model.
- Nonfinite or noninvertible final geometry routes the entire animation to
  legacy instead of emitting a partial native plan.
- Physical ownership distinguishes X and Y position targets. A replacement can
  preempt one axis without removing the other.

## Component policy

The geometry grid covers View, Text, Image, ScrollView, borders and radius,
shadow, clipping, and nested content. These components use one policy: their
final mounted content and sublayer tree are authoritative while Core Animation
presents the FLIP transform. This preserves final rendering and cleanup without
per-frame Fabric layout.

The deliberate tradeoff is that text and children scale during a size
transition rather than reflowing every frame. A component or animation that
requires exact per-frame reflow remains on the complete legacy route.

## Repository checks

- Full package tests: 95 suites and 1,445 tests passed.
- Layout-reanimation tests: 4 suites and 40 tests passed.
- `common-app type:check:native`: pass.
- `common-app lint`: zero errors; 208 pre-existing warnings.
- `react-native-reanimated lint:js`: pass.
- Apple and Android lint: pass.
- Debug FabricExample iOS Simulator build: pass.

## Simulator validation

The latest app was installed on iPhone 17 Pro, iOS 26.1 and reported
`COMPILED BACKEND NATIVE`. The geometry component grid was selected with a
3,000 ms duration and one repetition. A numeric keyboard then remained over the
bench's lower controls after normal dismissal and relaunch attempts. To avoid a
misdirected action, no animation, callback, or parity result is attributed to
this run.

## Validation limits

- No Simulator playback or visual-parity result is claimed.
- No frame-accurate video or physical-device run was captured.
- FLIP intentionally does not claim exact per-frame child or text reflow.
