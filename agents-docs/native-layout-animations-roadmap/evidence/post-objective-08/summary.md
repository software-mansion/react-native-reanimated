# Post-Objective-08 Evidence

## Result

Objective 08 passes compiler tests, repository checks, iOS compilation, and a
focused current-run Simulator proof of the direct Core Animation timing path.

## Implementation checks

- Canonical timing tracks build `CABasicAnimation` directly from typed IR.
- Timing/hold sequences build sparse `CAKeyframeAnimation` values, original key
  times, and `values.count - 1` timing functions.
- `Easing.bezier(...)` retains its four control points in the structural plan.
- Core Animation begins in the target layer's local clock.
- Final model values come from the preceding Fabric mount; the executor changes
  presentation only.
- Animation keys include owner, surface, tag, generation, and logical target.
- Track delegates aggregate into one logical completion.
- Sampled plans remain on the compatibility player; Android materializes the
  typed plan locally during this iOS-only phase.

## Repository checks

- Full package tests: 94 suites and 1,437 tests passed.
- `common-app type:check:native`: pass
- `fabric-example lint`: pass
- `react-native-reanimated lint:apple`: pass
- `react-native-reanimated lint:android`: pass
- `Debug FabricExample` iOS Simulator build: pass

## Simulator proof

Simulator: iPhone 17 Pro, iOS 26.1. Backend label: `NATIVE`.

Timing MVP Scenario 17, 1,000 ms, one repetition:

- current trace: run ID 3, `timing-linear-opacity-position`;
- result: PASS, one callback, final `finished=true`;
- route: `simple · canonical-single-timing`;
- `platform-started` ran on `thread:"main"` with `mainThread:true`;
- primitives: three `CABasicAnimation` instances;
- keys:
  - `reanimated.layout.11.2832.1.opacity`
  - `reanimated.layout.11.2832.1.originX`
  - `reanimated.layout.11.2832.1.originY`
- presentation X samples progressed approximately 26, 66.6, 108.7, 148.6,
  then the committed model value 185.

## Validation limits

- Argent could not activate Timing MVP Scenarios 18 and 19: their scrolled
  buttons overlapped the app navigation header and taps returned to the drawer.
  A fresh install, keyboard dismissal, relaunch, and one bounded retry produced
  the same harness-control issue. No result was claimed for those scenarios.
- The structural sequence and delay paths are covered by pure compiler tests
  and the built Apple factory, but lack a claimed Simulator trace at this
  capture point.
- No new legacy rebuild corpus or video was captured. Existing legacy behavior
  remains the oracle; this evidence does not claim measured performance.
