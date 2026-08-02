# Post-Objective-05 Evidence

Date: 2026-07-31

## Result

Objective 05 passed its implementation checks and focused iOS smoke test.

## Automated checks

- `yarn workspace react-native-reanimated test --runInBand`
  - 94 suites passed.
  - 1,431 tests passed.
- `yarn workspace common-app type:check:native`
  - Passed.
- `yarn workspace fabric-example lint`
  - Passed.
- `yarn workspace react-native-reanimated lint:apple`
  - Passed.
- `yarn workspace react-native-reanimated format:common`
  - Passed.
- FabricExample Debug build for the iPhone 17 Pro simulator
  - Passed with `CODE_SIGNING_ALLOWED=NO`.

## Argent iOS smoke

- Feature flags:
  - `ENABLE_SHARED_ELEMENT_TRANSITIONS=false`
  - `IOS_USE_NATIVE_LAYOUT_ANIMATIONS=true`
- Screen: `[LA] Native backend test bench`
- Compiled backend: `NATIVE`
- Scenario: `1. LinearTransition position only`
- Duration: 900 ms
- Result: `PASS`
- Callback count: 1
- Last callback value: `finished=true`
- Crash: none

The installed debug build did not expose native trace export controls. No JSONL
trace was exported. This does not block the Objective 05 interface-only smoke
test.

## Scope notes

- The shared plan still owns the current sampled layout descriptor.
- Objective 07 replaces this temporary payload with typed native tracks.
- Android runtime validation is outside the current iOS-only phase.
