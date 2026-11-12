# Benchmark app

A React Native app (Android and iOS, New Architecture, Hermes) that runs one benchmark scenario for each launch. A scenario animates without touch input and does not stop. The app does not measure: the tools of the operating system do.

The app is not a Yarn workspace of the repository. It has its own `yarn.lock`. Its `package.json` does not list `react-native-reanimated` and `react-native-worklets`. Each build adds the two packages to a copy of the app. To build or type check by hand, copy the app to a folder that git ignores (for example `.tmp/`), run `yarn add react-native-reanimated@<version> react-native-worklets@<version>` (or `@file:<tarball>`) in it, then run `yarn type:check` or build it.

## Launch

Android:

```sh
adb shell am start -W -S -n com.reanimatedbenchmark/com.reanimatedbenchmark.MainActivity \
  --es benchmarkScenario <name> [--ei benchmarkLoad <integer>]
```

iOS: launch arguments `-benchmarkScenario <name> [-benchmarkLoad <integer>]`.

`benchmarkLoad` replaces the load of the scenario. Use it only to find a load level.

The Gradle property `benchmarkApplicationIdSuffix` adds a suffix to the Android application id and the app label (`-PbenchmarkApplicationIdSuffix=.a` gives `com.reanimatedbenchmark.a`). On iOS, set `PRODUCT_BUNDLE_IDENTIFIER`.

## Report lines

The `BenchmarkReporter` TurboModule writes each line to logcat with the tag `ReanimatedBenchmark` on Android, and to stdout with the prefix `ReanimatedBenchmark: ` on iOS.

- `READY scenario=<name> version=<integer> load=<integer>`: 3000 ms after the scenario starts. The app writes it one time for each process.
- `FAILED scenario=<name or none> reason=<text>`: the name is missing or unknown, the load is not a positive integer, a requirement of the scenario is not met, or a JavaScript error occurs. The app writes `none` for an error before it reads the scenario name. After `FAILED`, the app does not write `READY`.

With no scenario or an unknown name, the app shows the list of scenario names.

## Scenarios

| Name | Content | Load |
| --- | --- | --- |
| `worklet-styles-transform` | Views with `useAnimatedStyle` that change `transform` and `opacity` | number of views |
| `worklet-styles-layout` | Views with `useAnimatedStyle` that change `width`, `height` and `marginLeft` | number of views |
| `css` | Views with CSS animations (even index) and CSS transitions (odd index). A transition starts every 500 ms. | number of views |
| `layout-animations` | A list whose items enter, exit and change order every 500 ms | number of items |
| `sticky-header` | A scroll view that scrolls 400 px down in 1000 ms and up in 1000 ms from the UI runtime, and moves a header and its items | number of items |
| `shared-elements` | Two native stack screens that push and pop with shared element transitions | views on a screen |
| `mount-unmount` | Animated views that mount for 500 ms and unmount for 500 ms. One more animated view stays mounted, so the frames continue. | number of views that mount and unmount |
| `idle-cost` | Plain views that React renders on each frame, with no Reanimated component | number of views |

Each Reanimated animation that has a `reduceMotion` option uses `ReduceMotion.Never`, so the reduced motion setting of the system does not stop the frames.

`shared-elements` needs the static flag `ENABLE_SHARED_ELEMENT_TRANSITIONS`. The default of the flag is `false` in 4.6.0, 4.7.1 and on `main`. Set the flag in the run config for each variant whose Reanimated version has it off. When the flag is off, the scenario writes `FAILED` and does not write `READY`.

## Add a scenario

1. Add a component that takes `{ load }` in `src/scenarios/`. Use only the public API of the oldest Reanimated version that you compare. Use no random values and no clock values in the content.
1. Add an entry with `name`, `version`, `load` and `Component` to `src/scenarios/registry.ts`.
1. If the scenario needs a condition (for example a static flag), add `findUnmetRequirement` to the entry. It returns the reason when the condition is not met, and the app then writes `FAILED`.
1. When you change what a scenario does, increase its `version`.
