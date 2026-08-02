# Post-Objective-07 Evidence

## Result

Objective 07 passes its common checks, typed-plan validation, iOS compilation,
and focused Simulator routing validation.

## Pure checks

- The structural compiler tests cover a canonical timing, sparse delayed
  sequences, opaque easing routed to sampling, unsupported properties, and
  transform ordering fallback.
- The full package suite passed: 94 suites and 1,436 tests.
- The C++ validator fuzz harness ran twice with seed `7999950`, 10,000 malformed
  plans per run, no crashes, and no invalid accepted plans.
- Both runs emitted the same canonical serialization:
  `{"durationMs":240,"route":"simple","reason":"canonical-single-timing","tracks":[{"target":"opacity","segmentCount":1}]}`.

## Repository checks

- `common-app type:check:native`: pass
- `fabric-example lint`: pass
- `react-native-reanimated lint:apple`: pass
- `react-native-reanimated lint:android`: pass
- `Debug FabricExample` iOS Simulator build: pass

## Simulator routing

- FadeIn/FadeOut at 900 ms passed with two callbacks and final
  `finished=true`. Its trace reported `sampled · requires-sampling` and contained
  platform scheduled, started, and completed events.
- The unsupported-style-property scenario passed with one callback and final
  `finished=true`. Its trace reported `legacy · unsupported-property`, showed
  legacy progress/Fabric updates, and contained no platform scheduling or start.
- Both results used current-run trace IDs rather than prior retained events.

## Limits

- Simulator validation is behavioral, not a device performance measurement.
- The Apple compatibility adapter still materializes scalar segments; Objective
  08 replaces simple timing materialization with direct Core Animation
  primitives.
- Ordered transforms remain whole-graph legacy fallback until Objective 10.
- The random validator harness is reproducible evidence but is not committed as
  a repository binary.
