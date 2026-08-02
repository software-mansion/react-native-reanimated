# Post-Objective-06 Evidence

Date: 2026-07-31

## Result

Objective 06 passed its automated checks and focused iOS validation.

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
- FabricExample Debug simulator build
  - Passed with `CODE_SIGNING_ALLOWED=NO`.

## Argent iOS validation

The app used the native layout-animation backend.

### Final model during layout

- Duration: 4,000 ms
- Result: passed
- Callback count: 1
- Last callback: `finished=true`
- Text, border, and background stayed visible.

### Delayed entering

- Delay: 1,000 ms
- Duration: 4,000 ms
- Result: passed
- Callback count: 1
- Last callback: `finished=true`
- Screenshot timing was not precise enough to prove the absence of a one-frame
  flash during the delay.

### Back-to-back final commits

- Result: passed
- Callback count: 2
- Last callback: `finished=true`
- No crash or visible snap-back occurred.

### Retained exit cleanup

- Duration: 3,000 ms on the latest build
- Result: passed
- Callback count: 2 for entering and exiting
- Last callback: `finished=true`
- A screenshot one second after the terminal callback showed that the retained
  view was removed.

## Trace note

The trace view returned stale JSONL for a different scenario. Do not use that
export as Objective 06 evidence. Model and presentation sampling remains in the
Debug instrumentation at start, midpoint, and completion.
