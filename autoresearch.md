# Autoresearch: Optimize Unit Test Runtime

## Objective
Optimize the wall-clock runtime of the react-native-reanimated Jest unit test suite (36 test suites, 898 tests) in `packages/react-native-reanimated`. The tests use Jest with `react-native` preset and babel-jest transform.

## Metrics
- **Primary**: `total_s` (seconds, lower is better) — total wall-clock time for `yarn test`
- **Secondary**: `tests_passed` — number of passing tests (must stay at 898), `suites_passed` — number of passing suites (must stay at 36)

## How to Run
`./autoresearch.sh` — outputs `METRIC name=number` lines.

## Files in Scope
- `packages/react-native-reanimated/jest.config.js` — Jest configuration
- `packages/react-native-reanimated/jest-setup.js` — Jest setup file
- `packages/react-native-reanimated/__tests__/` — Test files (16 files)
- `packages/react-native-reanimated/src/css/**/__tests__/` — CSS module tests (20 files)
- `packages/react-native-reanimated/src/` — Source files being tested

## Off Limits
- Do NOT modify test assertions, expected values, or test logic to make tests "trivially" pass
- Do NOT skip, disable, or remove any tests
- Do NOT modify source code in ways that break runtime behavior (only perf-safe refactors)
- Do NOT add new dependencies
- Do NOT cheat benchmarks (e.g., caching test results, mocking more than necessary)

## Constraints
- All 36 test suites must pass
- All 898 tests must pass
- All 162 snapshots must match
- Test correctness must be preserved — tests must still validate the same behavior

## Slowest Tests (baseline)
1. `plugin.test.ts` — ~13-18s (babel transforms, 2656 lines)
2. `InterpolateColor.test.tsx` — ~11-16s (rendering + animation)
3. `Animation.test.tsx` — ~8-12s
4. `inlineStyles.test.tsx` — ~8-12s
5. `props.test.tsx` — ~8-11s
6. `hooks.useAnimatedStyle.test.tsx` — ~7-11s
7. Various others in __tests__/ — 6-10s each

## What's Been Tried
(Nothing yet — establishing baseline)
