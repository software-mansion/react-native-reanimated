# Benchmark app

A React Native app (Android and iOS, New Architecture, Hermes) that runs one benchmark scenario for each launch. A scenario animates without touch input and does not stop. The tools of the operating system measure the frames and the CPU time. On iOS, the app also reports its cold start time, its memory footprint and the state of the device, because the [driver](scripts/README.md) reads them from the app and not from a host tool.

The app is not a Yarn workspace of the repository. It has its own `yarn.lock`. Its `package.json` does not list `react-native-reanimated` and `react-native-worklets`. Each build adds the two packages to a copy of the app. To build or type check by hand, copy the app to a folder that git ignores (for example `.tmp/`), run `yarn add react-native-reanimated@<version> react-native-worklets@<version>` (or `@file:<tarball>`) in it, then run `yarn type:check` or build it.

## Launch

Android:

```sh
adb shell am start -W -S -n com.reanimatedbenchmark/com.reanimatedbenchmark.MainActivity \
  --es benchmarkScenario <name> [--ei benchmarkLoad <integer>]
```

iOS: launch arguments `-benchmarkScenario <name> [-benchmarkLoad <integer>]`.

`benchmarkLoad` replaces the load of the scenario. Use it only to find a load level.

The Gradle property `benchmarkApplicationIdSuffix` adds a suffix to the Android application id and the app label (`-PbenchmarkApplicationIdSuffix=.a` gives `com.reanimatedbenchmark.a`). On iOS, the build setting `BENCHMARK_BUNDLE_IDENTIFIER_SUFFIX` does the same (`xcodebuild ... BENCHMARK_BUNDLE_IDENTIFIER_SUFFIX=.a` gives `com.reanimatedbenchmark.a`).

## Measure

The driver in [`scripts/`](scripts/README.md) measures the app on a real Android phone or on a real iPhone. `run` compares two builds for each scenario and metric. `memory` reads the memory of two builds in one scenario for a long time and looks for a leak (Android only).

## Report lines

The `BenchmarkReporter` TurboModule writes each line to logcat with the tag `ReanimatedBenchmark` on Android, and to stdout with the prefix `ReanimatedBenchmark: ` on iOS.

- `READY scenario=<name> version=<integer> load=<integer> jsThread=<integer>`: 3000 ms after the scenario starts. The app writes it one time for each process. `jsThread` is the id of the JavaScript thread: a synchronous call of the TurboModule on that thread reads `android.os.Process.myTid()` on Android and `pthread_threadid_np` on iOS.
- `FAILED scenario=<name or none> reason=<text>`: the name is missing or unknown, the load is not a positive integer, a requirement of the scenario is not met, or a JavaScript error occurs. The app writes `none` for an error before it reads the scenario name. After `FAILED`, the app does not write `READY`.

On iOS, the native class `ProcessReporter` also writes:

- `LAUNCH pid=<integer> mainThread=<integer> refreshRate=<integer> thermal=<0-3> coldStart=<ms>` to stdout, on the first display link callback. `coldStart` is the time from the start of the process (`p_starttime` of `sysctl`) to this callback. `refreshRate` is `UIScreen.maximumFramesPerSecond`. `thermal` is `ProcessInfo.thermalState`.
- A signpost event `State` each second (subsystem `com.reanimatedbenchmark`, category for dynamic tracing; when no tool records, the cost is one timer call on the main queue each second): `footprint=<kB> thermal=<0-3> batteryLevel=<percent> batteryState=<0-3> lowPower=<0|1> brightness=<percent>`. `footprint` is `phys_footprint` of `task_info`.

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
| `idle-cost` | Plain views that React renders on each second frame, with no Reanimated component | number of views |

Each Reanimated animation that has a `reduceMotion` option uses `ReduceMotion.Never`, so the reduced motion setting of the system does not stop the frames.

`shared-elements` needs the static flag `ENABLE_SHARED_ELEMENT_TRANSITIONS`. The default of the flag is `false` in 4.6.0, 4.7.1 and on `main`. Set the flag in the run config for each variant whose Reanimated version has it off. When the flag is off, the scenario writes `FAILED` and does not write `READY`.

## Add a scenario

1. Add a component that takes `{ load }` in `src/scenarios/`. Use only the public API of the oldest Reanimated version that you compare. Use no random values and no clock values in the content.
1. Add an entry with `name`, `version`, `load` and `Component` to `src/scenarios/registry.ts`.
1. If the scenario needs a condition (for example a static flag), add `findUnmetRequirement` to the entry. It returns the reason when the condition is not met, and the app then writes `FAILED`.
1. When you change what a scenario does, increase its `version`.
