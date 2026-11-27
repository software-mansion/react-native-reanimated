# Benchmark app

A React Native app (Android and iOS, New Architecture, Hermes) that runs one benchmark scenario for each launch. A scenario animates without touch input and does not stop. On Android, the tools of the operating system measure the frames and the CPU time. On iOS, the app measures its CPU time, its UI updates, its mount transactions, its memory footprint, its cold start time and the state of the device, and the [driver](scripts/README.md) reads the values from the app.

The app is not a Yarn workspace of the repository. It has its own `yarn.lock`. Its `package.json` does not list `react-native-reanimated` and `react-native-worklets`. Each build adds the two packages to a copy of the app. To build or type check by hand, copy the app to a folder that git ignores (for example `.tmp/`), run `yarn add react-native-reanimated@<version> react-native-worklets@<version>` (or `@file:<tarball>`) in it, then run `yarn type:check` or build it.

## Launch

Android:

```sh
adb shell am start -W -S -n com.reanimatedbenchmark/com.reanimatedbenchmark.MainActivity \
  --es benchmarkScenario <name> [--ei benchmarkLoad <integer>]
```

iOS: launch arguments `-benchmarkScenario <name> [-benchmarkLoad <integer>] [-benchmarkEpochs <plan> [-benchmarkStart ready|notification]]`. See [iOS collector](#ios-collector) for the plan. The iOS app needs iOS 18 or newer.

`benchmarkLoad` replaces the load of the scenario. Use it only to find a load level.

The Gradle property `benchmarkApplicationIdSuffix` adds a suffix to the Android application id and the app label (`-PbenchmarkApplicationIdSuffix=.a` gives `com.reanimatedbenchmark.a`). On iOS, the build setting `BENCHMARK_BUNDLE_IDENTIFIER_SUFFIX` does the same (`xcodebuild ... BENCHMARK_BUNDLE_IDENTIFIER_SUFFIX=.a` gives `com.reanimatedbenchmark.a`). The driver also sets `BENCHMARK_APP_BUILD` to the app build identity: a hash of the app project files, the build tools (Node, and on iOS the Xcode and SDK versions) and the build procedure of the driver. The app keeps it in `Info.plist` (`BenchmarkAppBuild`) and writes it in the LAUNCH line.

## Measure

The driver in [`scripts/`](scripts/README.md) measures the app on a real Android phone or on a real iPhone. `run` compares two builds for each scenario and metric. `memory` reads the memory of two builds in one scenario for a long time and looks for a leak (Android only).

## Report lines

The `BenchmarkReporter` TurboModule writes each line to logcat with the tag `ReanimatedBenchmark` on Android, and to stdout with the prefix `ReanimatedBenchmark: ` on iOS.

- `READY scenario=<name> version=<integer> load=<integer> jsThread=<integer>`: 3000 ms after the scenario starts. The app writes it one time for each process. `jsThread` is the id of the JavaScript thread: the synchronous call `markReady` of the TurboModule on that thread reads `android.os.Process.myTid()` on Android and `pthread_threadid_np` on iOS. On iOS, the same call gives a Mach handle of the JS thread to the collector and starts it.
- `FAILED scenario=<name or none> reason=<text>`: the name is missing or unknown, the load is not a positive integer, a requirement of the scenario is not met, or a JavaScript error occurs. The app writes `none` for an error before it reads the scenario name. After `FAILED`, the app does not write `READY`.

On iOS, the native class `ProcessReporter` also writes `LAUNCH pid=<integer> mainThread=<integer> refreshRate=<integer> thermal=<0-3> coldStart=<ms> build=<hash>` to stdout, on the first display link callback. `build` is empty for a build without `BENCHMARK_APP_BUILD`. `coldStart` is the time from the start of the process (`p_starttime` of `sysctl`) to this callback. `refreshRate` is `UIScreen.maximumFramesPerSecond`. `thermal` is `ProcessInfo.thermalState`. The collector writes the `SAMPLE` line.

With no scenario or an unknown name, the app shows the list of scenario names.

## iOS collector

With the launch argument `-benchmarkEpochs <load>:<collector>:<seconds>[,...]`, the native class `BenchmarkSampler` measures the app in epochs. With `-benchmarkStart ready` (the default), the first epoch starts after the `markReady` call of the JS thread. With `-benchmarkStart notification`, it starts on the Darwin notification `com.reanimatedbenchmark.start-epochs`, but not before the `markReady` call. The app observes the notification from its launch. Before the first boundary, the sampler reads all counters one time and does not use the values, because the first call can take more time. At each epoch boundary, on the main thread, the sampler:

1. reads the user and system time of the main thread and of the JS thread (`thread_info(THREAD_BASIC_INFO)` of the Mach handle that each thread gives, and the thread id of `THREAD_IDENTIFIER_INFO` to check the handle), then the counters of the process (`task_info(TASK_POWER_INFO_V2)`: the user and system time, the time on the performance cores and the count of processor set switches), then the instructions and the cycles of the process (`task_inspect(TASK_INSPECT_BASIC_COUNTS)`), in this order, each between two reads of the monotonic clock,
1. reads `phys_footprint` (`task_info(TASK_VM_INFO)`) between two reads of the monotonic clock, then the thermal state, the battery level and state, the low power mode, the brightness and the count of mount transactions,
1. writes a signpost event `Boundary` with `index=<n>` (subsystem `com.reanimatedbenchmark`, category for dynamic tracing, so it has no cost when no tool records), between two reads of the monotonic clock.

In a `full` epoch, a passive `UIUpdateLink` of the window scene records each UI update: the time of the entry to the phase `beforeCADisplayLinkDispatch`, the time of the entry to the phase `afterCATransactionCommit`, and `modelTime`. The buffer has room for twice the maximum refresh rate times the length of the `full` epochs, and the sampler allocates it before the first epoch. An `RCTSurfacePresenterObserver` counts `didMountComponentsWithRootTag:` for all surfaces. In an `endpoints` epoch, the update link is off. The sampler also keeps the highest thermal state of the notifications in the epochs. A timer of the main queue with no leeway ends each epoch. For each epoch, the sampler counts the work units of the loads of `crosscheck-load`: a unit of the load of the epoch counts as `own`, a unit of another load as `other`. Before the end read of a known-work epoch, the sampler stops the count of its units, and after the read it lets the worker thread end.

After the last epoch, the app writes one line `SAMPLE <json>` with `format` (5), `error` (`null`, or the reason of a failed read), `mainThread`, `jsThread`, `cpuCount` (`NSProcessInfo.processorCount`), `maxThermal`, `epochs` (each with its `work`), `boundaries` (the reads; each time in ns from the start of the first read: the two clock reads around each counter read (`instructionReadStartNs` and `instructionReadEndNs` for the instructions), around the footprint read and around the signpost; the CPU times in µs; `processPerformanceCpuUs`, `processClusterSwitches`, `processInstructions` and `processCycles`) and `updates` (`beginNs`, `endNs` and `modelTimeNs`). The app writes no text during the epochs.

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

The validation scenario `crosscheck-load` (iOS only, in `src/scenarios/validationRegistry.ts`) is not a benchmark scenario. It makes no work (`idle`), busy work of 6 ms on each display refresh on the UI thread (`ui-stall`, a display link of the native sampler), busy work of 6 ms in each animation frame on the JS thread (`js-load`), or a new render of all views in each animation frame (`render-heavy`). The known-work loads run units of a loop with a fixed instruction count: on a new native thread 1000 units with the user-interactive QoS (`known-work`), 2000 units (`known-work-double`), 1000 units with the background QoS (`known-work-background`) or 1000 units on a thread that ends after its units (`known-work-ended`); 250 units on each of 4 new threads at the same time (`known-work-parallel`); or 1000 units on the main thread (`known-work-main`). The JS loads read the load of the current epoch with the TurboModule call `currentEpochLoad` every 50 ms, and they count each unit with `countEpochWork`. A `render-heavy` unit is one requested render step (a state update), not a completed mount. Because of the 50 ms poll, a JS load can continue for a short time into the next epoch. The `crosscheck` and `known-work` commands of the driver use it.

`shared-elements` needs the static flag `ENABLE_SHARED_ELEMENT_TRANSITIONS`. The default of the flag is `false` in 4.6.0, 4.7.1 and on `main`. Set the flag to `true` in both variants of the run config: the driver stops before it builds when a variant does not set it. When the flag is off, the scenario writes `FAILED` and does not write `READY`.

## Add a scenario

1. Add a component that takes `{ load }` in `src/scenarios/`. Use only the public API of the oldest Reanimated version that you compare. Use no random values and no clock values in the content.
1. Add an entry with `name`, `version`, `load` and `Component` to `src/scenarios/registry.ts`.
1. If the scenario needs a condition (for example a static flag), add `findUnmetRequirement` to the entry. It returns the reason when the condition is not met, and the app then writes `FAILED`. Declare each static flag that the scenario reads in `scenarios.mts` of the driver.
1. When you change what a scenario does, increase its `version`.
