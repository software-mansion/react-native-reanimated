# Benchmark driver

The driver measures the [benchmark app](../README.md) on a real Android phone or on a real iPhone. `run` compares two builds of the app, A and B, and gives one verdict for each scenario and each verdict metric. `memory` looks for a memory leak in one scenario (Android only). Lower values are better for all metrics.

## Quick start

Run all commands from the repository root.

### Android

Connect a phone with SDK 31 or newer and the ABI `arm64-v8a`, and allow USB debugging. Write a config, for example `.tmp/benchmarks/configs/sync-props.json`:

```json
{
  "name": "sync-props",
  "a": { "reanimated": "4.7.1", "worklets": "0.13.1" },
  "b": {
    "reanimated": "4.7.1",
    "worklets": "0.13.1",
    "reanimatedFlags": { "ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS": true }
  },
  "scenarios": ["worklet-styles-transform", "css"],
  "expect": [
    { "scenarios": ["worklet-styles-transform"], "metrics": ["uiThreadCpu"], "is": "better" },
    { "is": "notWorse" }
  ]
}
```

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run \
  --config .tmp/benchmarks/configs/sync-props.json --serial <adb serial> \
  --noise-limits .tmp/benchmarks/noise-limits/a16.json
```

### iOS

Connect an iPhone with iOS 18 or newer and a display of 60 Hz, with Developer Mode on, paired with the Mac and unlocked. Get its UDID from `xcrun devicectl list devices`. Write a [sign command](#sign-command).

This example compares Reanimated 4.7.1 with the code of your checkout. Make the tarballs of the checkout. `npm pack` runs the `prepack` script of each package (`yarn build`), and the file name has the version of its `package.json`: Use `npm pack`, not `yarn pack`: Yarn leaves the nested workspaces of Worklets (its two plugins) out of the tarball.

```sh
mkdir -p .tmp/benchmarks/tarballs
(cd packages/react-native-worklets && npm pack --pack-destination ../../.tmp/benchmarks/tarballs)
(cd packages/react-native-reanimated && npm pack --pack-destination ../../.tmp/benchmarks/tarballs)
```

Write a config, for example `.tmp/benchmarks/configs/ios-css.json`. Each variant must have a Worklets version that `packages/react-native-reanimated/compatibility.json` gives for its Reanimated version:

```json
{
  "name": "ios-css",
  "a": { "reanimated": "4.7.1", "worklets": "0.13.1" },
  "b": {
    "reanimated": "../tarballs/react-native-reanimated-4.8.0-main.tgz",
    "worklets": "../tarballs/react-native-worklets-0.14.0-main.tgz"
  },
  "scenarios": ["css", "idle-cost"]
}
```

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run \
  --config .tmp/benchmarks/configs/ios-css.json --udid <UDID> \
  --sign-command ./sign-benchmark.sh
```

The driver writes the path of the run folder to stderr at the start. The report is `report.md` in that folder.

## Commands

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> <device> [--blocks 5] [--noise-limits <file.json>] [--validation <file.json>] [--output-dir <dir>] [--keep-traces] [--trace-processor <path>] [--sign-command <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --resume <run folder> <device> [--trace-processor <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --config <file.json> --scenario <name> --serial <adb serial> [--output-dir <dir>] [--launches 2] [--interval 60] [--duration 1200] [--slope-limit 1000] [--keep-traces] [--trace-processor <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --resume <run folder> --serial <adb serial> [--trace-processor <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits --runs <run folder> [<run folder> ...]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts sample <device> --package <application id> --scenario <name> [--load <integer>] [--keep-trace] [--trace-processor <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts crosscheck --udid <UDID> --package <application id> --scenario <name> --epochs <load>:<full|endpoints>:<seconds>[,...] [--load <integer>] [--output-dir <dir>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts observer-cost --udid <UDID> --package <application id> --scenario <name> [--blocks 5] [--noise-limits <file.json>] [--load <integer>] [--output-dir <dir>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts validation-record --crosscheck <folder> [--crosscheck <folder> ...] --observer-cost <folder> [--observer-cost <folder> ...]
```

- `<device>` is `--serial <adb serial>` (Android) or `--udid <UDID>` (iOS).
- `--trace-processor`, `--keep-traces` and `--keep-trace` are for Android only. `--sign-command` and `--validation` are for iOS only, and an iOS `run` needs `--sign-command`.
- `run` builds A and B, installs them and measures each scenario of the config in blocks. A block measures A, B, B, A, and each second block measures B, A, A, B. `--blocks` sets the number of blocks for each scenario.
- `run --resume` continues a run that is not `done`. See [Stopped runs](#stopped-runs).
- `memory` reads the memory of A and B in one scenario for a long time. See [Memory test](#memory-test).
- `noise-limits` reads A/A runs and writes a noise limits record to stdout. See [Calibration](#calibration).
- `sample` measures one scenario of an installed app one time and writes the metrics as JSON to stdout. Use it to find the load of a scenario.
- `crosscheck` and `observer-cost` (iOS only) validate the in-app collector of iOS, and `validation-record` writes a validation record from their folders to stdout. See [Validation of the iOS collector](#validation-of-the-ios-collector).

## Config

- `name`: letters, digits, `.`, `_` or `-`. The run folder has this name.
- `a`, `b`: the two variants. `reanimated` and `worklets` are an exact npm version or a path to a tarball from `npm pack`. A relative path starts at the folder of the config.
- `reanimatedFlags`, `workletsFlags` (optional): static flags. The other flags keep the defaults of the installed library. An unknown flag is a tool error. A scenario that needs a static flag (`shared-elements` needs `ENABLE_SHARED_ELEMENT_TRANSITIONS`) needs the flag set to `true` in both variants. The driver does not know the default of a flag in a library version, so it stops before it builds when a variant does not set the flag.
- `profiling: true` (optional, Android only) builds with the profiling Gradle properties. `bundleMode: true` is not supported.
- `scenarios`: one or more scenario names of the [benchmark app](../README.md#scenarios).
- `blocks` (optional): the number of blocks for a scenario. It replaces `--blocks` for that scenario.
- `expect` (optional): a list of entries with `scenarios` (default: all), `metrics` (default: all verdict metrics of the platform), `is` (`notWorse` or `better`) and `byAtLeast` (a fraction, only with `better`). The default is `[{ "is": "notWorse" }]`.
- `note` (optional): a text for the report.

The driver stops before it builds when the config has an unknown field, scenario or metric.

## Tools

- Node from `.nvmrc` and Yarn 4.
- Android: the Android SDK (`ANDROID_HOME`, or the default SDK folder), `adb` (SDK `platform-tools`, or `PATH`), a JDK for Gradle (tested with JDK 17, the version of the Android workflows of the repository; `android/gradle/wrapper/gradle-wrapper.properties` gives Gradle 9.4.1), and `trace_processor_shell` of Perfetto (`--trace-processor`, then `TRACE_PROCESSOR_SHELL`, then `PATH`).
- iOS: Xcode with `xcodebuild` and `devicectl` (tested with Xcode 27.2), `xctrace` for `crosscheck`, Ruby and Bundler for CocoaPods (tested with Ruby 3.3.7 of `.ruby-version`), and a [sign command](#sign-command).

## Calibration

The noise limit of a verdict row is the difference that the driver gets between two equal builds. Make the limits for each phone model, platform and measurement revision:

1. Write a config with the same `a` and `b` (an A/A config) and the scenarios to calibrate, for example `.tmp/benchmarks/configs/aa.json`.
1. Run it. More blocks give better limits.
1. Make the record from the run folder.
1. Give the record to each run on this phone model: `--noise-limits <record>`.

Android:

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run \
  --config .tmp/benchmarks/configs/aa.json --serial <adb serial> --blocks 10
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits \
  --runs <run folder> > .tmp/benchmarks/noise-limits/a16.json
```

iOS:

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run \
  --config .tmp/benchmarks/configs/aa.json --udid <UDID> \
  --sign-command ./sign-benchmark.sh --blocks 10
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits \
  --runs <run folder> > .tmp/benchmarks/noise-limits/iphone-14.json
```

The record has `formatVersion` (1), `platform`, `device` (`model`, `deviceId`, `osBuild`), `measurementRevision`, `sources` (each run folder with the accepted samples of A and B for each scenario), `scenarios` (`{ "<scenario>": { "version": <integer>, "load": <integer> } }` from the READY lines of the accepted samples) and `limits` (`{ "<scenario>": { "<metric>": <limit> } }`). A limit is a fraction for a relative metric and a share for an absolute metric (`jankyFrames`; 0.005 is 0.5 percentage points).

For each scenario and verdict metric, `noise-limits`:

1. puts the accepted samples of A and B in one group,
1. divides the group in all possible ways into two groups with the sizes of A and B (above 200000 ways, 20000 random ways with a fixed seed),
1. compares the medians of the two groups as the verdict does,
1. takes the 97.5th percentile of the absolute differences, but not less than the floor: 0.02 for a relative metric and 0.005 for an absolute metric.

When the relative difference is not defined for a division (a median of 0 or less), the record has no limit for that metric. The runs must have the same platform, device and measurement revision, a scenario must be in one run only, and the accepted samples of a scenario must have one version and one load. The runs do not have to be `done`: the command uses their complete scenarios. A run is A/A when A and B have the same sources, installed versions, `yarn.lock`, effective flags and build options.

`run` stops when the record has another platform, another phone model or another measurement revision, and when the app reports another version or load of a scenario than the record. A verdict row without a limit in the record has the limit 0, and the report marks its verdict `(uncalibrated)`. A run without `--noise-limits` is uncalibrated: the limit of each row is 0, and the report says so.

## Output

- Builds: `.tmp/benchmarks/builds/<key>/`. The driver builds a variant again only when its key changes. The key has the variant (sources, tarball hashes, flags, build options), the application id suffix, the files of the app project (with `yarn.lock`), the build procedure of the driver, the Node version and the build tools: on Android the JDK (`java -version`) and the NDK and build tools revisions of `android/build.gradle`, on iOS the Xcode version and the `iphoneos` SDK version and build. The build key cannot contain the transitive versions that `yarn add` resolves. The SHA-256 of the resolved `yarn.lock` of the build copy (`lockfileSha256` of each variant in `result.json`, and the report) shows them.
- Runs: `<output dir>/<date>-<name>/`, and `<output dir>/<date>-<name>-memory-<scenario>/` for a memory test. The output dir is `--output-dir`, or `.tmp/benchmarks/runs/`. The folder has `result.json` (all samples and statistics), `report.md`, `summary.json`, and on Android `traces/` with the trace of each invalid sample (all traces with `--keep-traces`). An iOS sample has no trace. An iOS run folder also has `signed/` with the signed apps. `sample` writes its Android trace to `.tmp/benchmarks/samples/`.
- Validation: `<output dir>/<date>-crosscheck-<scenario>/` and `<output dir>/<date>-observer-cost-<scenario>/`. The output dir is `--output-dir`, or `.tmp/benchmarks/validation/`.
- `result.json` has the format version 1. The driver writes it after each sample. Another version, or a missing or wrong field that the driver reads, is a tool error.
- `summary.json` (format version 1) has the `command`, the `status`, the `exitCode` and its `reason`, the expectations that do not hold (`failedExpectations`), the count of each verdict (`verdictCounts`), and the relative paths of `report.md` and `result.json`. The driver writes it at the end of each segment, also after a tool error (exit code 2) or an interrupt (exit code 130 or 143). An error before the run folder exists, for example an invalid config, gives no run folder.
- Exit code of `run`: 0 when all expectations hold, 1 when an expectation fails or is not decided, 2 for a tool error.

## Measurement

For each sample, the driver stops the apps, waits for a cool phone, launches the app in the scenario, waits for the READY line of the app, measures for 10 s and computes the metrics. On Android, the driver records a Perfetto trace. On iOS, the app measures itself and writes the values after the 10 s.

- The measurement revision (`measurement-rules.mts`) names the rules of collection, parsing and acceptance. The driver stores it in each result and in each noise limits record. Numbers and verdicts are valid only within one platform, one phone and one measurement revision.
- A sample is invalid when the app crashes before or during the measurement (`crash`), when the phone is hot (`thermal`), when the app draws fewer than 90% of the expected frames (`frames`), or when the app does less work than the scenario needs (`work`). The driver then measures the block again. After 3 invalid blocks in sequence, the scenario fails, and the report gives the cause and the detail of each of the 3 blocks.
- Each scenario declares its requirements in `scenarios.mts`. The update share is the share of the display refreshes in which the app updates its views: 1 for each scenario except `idle-cost` (0.5). The work check is the minimum `mountBatchCount` in one recording of 10 s. Only `shared-elements` has one: 300. Basis: in the first runs, a working sample had 574 to 628 (Samsung Galaxy A16) and 588 to 710 (iPhone 13 mini, from the React Native signposts of an earlier trace method), and a sample with stopped transitions had 38. The static flags of a scenario are the flags that its source reads: only `shared-elements` has one, `ENABLE_SHARED_ELEMENT_TRANSITIONS`.
- Each platform declares its verdict metrics and its advisory metrics (`android-definition.mts`, `ios-definition.mts`). The report shows an advisory metric with its difference and interval and "no verdict". It has no noise limit, and an expectation cannot select it. The report of each run defines all metrics of its platform.
- A device command that does not finish in its time limit is a tool error.

### Android

- Before each cool-down, and before and after each trace, the driver reads the phone state. The run stops when the phone, its build, the brightness, the power source, the battery level, the Wi-Fi state or the refresh rate changes. The refresh rate of the app in the first sample is the reference for the run.
- Cool-down: at least 10 s, then until the thermal status is 0 and the battery temperature is within 2 °C of the start of the run. After 10 minutes, the run stops.
- The driver installs each build with `adb install` and compiles it with `cmd package compile -m speed`.
- The app gives the id of its JS thread in the READY line (`jsThread`). A READY line without `jsThread` is a tool error, and so is a trace without a thread `mqt_v_js` with this id.
- A trace without a `Choreographer#doFrame` slice on any thread is a tool error: the atrace category `view` gave no data. When only other processes have these slices, the app drew no frame, and the sample is invalid (`frames`).
- The clock rate comes from the ftrace event `power/cpu_frequency` and from `linux.sys_stats` (each 1000 ms).

| Metric | Unit | Source | Interval | Limits | Verdict |
| --- | --- | --- | --- | --- | --- |
| `frameDurationMedian`, `frameDurationP95` | ms | Perfetto: duration of the `Choreographer#doFrame` slices on the main thread of the app | Slices that start in the trace window | The work of the main thread only. `RenderThread` is not in it. | yes |
| `frameDurationP90`, `frameDurationP99` | ms | The same as `frameDurationMedian` | Slices that start in the trace window | The same as `frameDurationMedian`. | no, stored |
| `frameCyclesMedian`, `frameCyclesP95` | Mcycles (10^6 CPU cycles) | An estimate of the CPU cycles that the scheduler gave to the main thread inside each complete `Choreographer#doFrame` slice: the running time of the main thread on each core multiplied by the recorded clock rate of that core (`power/cpu_frequency`). The median and the 95th percentile over the frames that count. | Slices that start and end in the trace window. A scheduling slice that is open at the end of the trace ends at the end of the trace. | There is no instruction counter. Blocked time, work outside the frame slice, other threads, rendering and the GPU are not in it. Cycles on different core types are not equal work. Missing clock rate data makes the value lower. The CPU clock rate can fall, so a frame can take more time with fewer cycles. A frame counts when 95% or more of its running time has a known clock rate. `null` when fewer than 95% of the complete frames count. | no verdict, shown |
| `frameCyclesCoverage` | share | Share of the complete `Choreographer#doFrame` slices that count for `frameCyclesMedian` | Slices that start and end in the trace window | `null` when the trace window has no complete frame. | no, stored |
| `jankyFrames` | share of frames | `max(0, 1 - frameCount / expectedFrameCount)` | Trace window: from the start of all data sources to the end of the recording of 10 s | Counts the refreshes without a frame of the app. A slow frame that the app still draws does not count. | yes |
| `frameCount`, `expectedFrameCount` | count | Count of the `Choreographer#doFrame` slices on the main thread; the refresh rate of the display times the length of the trace window | Trace window: from the start of all data sources to the end of the recording of 10 s | Each scenario requests a frame on each refresh, also `idle-cost`. The expected count does not use the update share of the scenario. | no, stored |
| `uiThreadCpu` | ms for each s | Perfetto `sched` slices of the main thread of the app | Trace window: from the start of all data sources to the end of the recording of 10 s. A slice is cut to the window. | CPU time does not show a change of the clock rate. | yes |
| `jsThreadCpu` | ms for each s | Perfetto `sched` slices of the JS thread (`jsThread` of the READY line) | Trace window: from the start of all data sources to the end of the recording of 10 s. A slice is cut to the window. | CPU time does not show a change of the clock rate. | yes |
| `renderThreadCpu`, `otherThreadsCpu`, `processCpu` | ms for each s | Perfetto `sched` slices of `RenderThread`, of the other threads of the app, and of all threads of the app | Trace window: from the start of all data sources to the end of the recording of 10 s. A slice is cut to the window. | CPU time does not show a change of the clock rate. | no, stored |
| `uiThreadCpuWork`, `processCpuWork` | MHz·ms for each s (1 MHz·ms is 1000 CPU cycles) | Duration of each scheduling slice times the clock rate of its CPU at that time, for the main thread and for all threads of the app. It gives the values of `cpu_cycles_per_thread_in_interval` of the Perfetto standard library. | Trace window: from the start of all data sources to the end of the recording of 10 s. A slice is cut to the window. | CPU time without a known clock rate (for example before the first clock rate value of its CPU) does not count. A scheduling slice that is open at the end of the trace does not count. `null` when no running time has a known clock rate. | no, stored |
| `mountBatchCount` | count | Count of the `IntBufferBatchMountItem::mountViews` slices of the app | Slices that start in the trace window | The work check of a scenario uses it. | no, stored |
| `memory` | kB | The last value of `mem.rss.anon` plus the last value of `mem.swap` of the app process (`linux.process_stats`, each 1000 ms). Swap is 0 when the trace has no `mem.swap` value. | The full trace. The counters are not cut to the trace window. | One value near the end of the trace. | yes |
| `windowMemoryDelta` | kB | `memory` minus the sum of the first value of `mem.rss.anon` and the first value of `mem.swap` | The full trace. The counters are not cut to the trace window. | The trace is in the first minutes after the launch. Use the memory test to find a leak. | no, stored |
| `coldStart` | ms | `TotalTime` of `am start -W` | From the launch intent to the first frame of the activity | Ends before React Native shows content. One value for each launch. | yes |
| `drawFrameMedian`, `drawFrameP95` | ms | Duration of the `DrawFrame` slices on `RenderThread` | Slices that start in the trace window | `null` when the window has no slice. | no, stored |
| `frameTimelineDurationMedian`, `frameTimelineDurationP95`, `frameTimelineFrameCount` | ms; count | Duration and count of the frame timeline rows of the app | Rows that start in the trace window | On some phones each frame has the jank type "Buffer Stuffing", and the durations change in steps of one refresh period. | no, stored |
| `jankFlaggedFrames`, `appDeadlineMissedFrames` | share of frames | Share of the frame timeline rows with a jank type, and with the jank type `App Deadline Missed` | Rows that start in the trace window | `null` when the window has no row. | no, stored |

### iOS

- Before each sample, the driver reads the UDID, the product type and the OS build with `devicectl`. A change stops the run.
- The driver does not read the thermal state or the battery of the iPhone while no app runs. The app gives them: the LAUNCH line gives the thermal state, and each counter read of the app gives the thermal state, the battery level, the battery state, the low power mode and the brightness. When the thermal state at the launch is above `Nominal`, the driver stops the app, waits 30 s and launches it again; after 10 minutes, the run stops. A value that is not the value of the first sample of the run stops the run.
- After each install, the driver launches the app one time and stops it, because the first launch after an install is slow.
- The driver gives the app a sample plan as launch arguments: `-benchmarkEpochs none:full:10 -benchmarkStart ready`. At READY, the app starts a window of 10 s on a strict timer of the main queue. The [benchmark app](../README.md#ios-collector) reads its counters at the start and at the end of the window, records each UI update in the window into a buffer that it allocates before the window, and writes one `SAMPLE` line after the window. It writes no text during the window. The driver stops the app after the `SAMPLE` line. A sample has no trace, and no Instruments recording runs.
- `crash`: the app writes `FAILED`, the console command ends before the `SAMPLE` line, or the `SAMPLE` line does not come in 40 s after READY (the plan and 30 s). `thermal`: a counter read or a notification of the app in the window shows a state above `Nominal`. `frames`: the app has fewer UI updates than 90% of the display refreshes of the window. The update share of a scenario does not apply on iOS: the expected count is all display refreshes, because the app has a UI update on each refresh while a display link of React Native or Reanimated runs (`idle-cost` too).
- These are tool errors: a launch command that does not start the app, a READY line without a LAUNCH line or without `jsThread`, a display whose maximum refresh rate is not 60 Hz, an error of the sampler in the `SAMPLE` line (a failed counter read, a thread id that changed, an update without its two phases, a full buffer), a `SAMPLE` line of other threads than the LAUNCH and READY lines give, a counter that goes down, a process CPU time less than the sum of the two threads by more than the read delay and the counter resolution, counter reads that take more than 0.1% of the window, a UI update outside the window, UI updates that are not on a fixed cadence of the display, and a window in which each UI update is 2 or more display periods after the one before it.
- Each counter read has its own two clock reads, and the `Boundary` signpost too. A CPU value uses the span between the reads of its own counter. Its timing uncertainty is the sum of the half widths of its two reads and 1 µs (the counter resolution), over the span. The process value is read last, so it can be less than the sum of the two threads by at most the time from the start of each thread read to the end of the process read at the start of the window, and 3 µs.
- The report gives the count of invalid samples for each cause and variant. A LAUNCH or READY line that comes at or after its time limit of 60 s does not count. After each launch, the driver stops the console and the app, also after a tool error.
- The verdict metrics are the CPU time of the main thread and the JS thread, and the memory. A verdict metric gets a verdict only when a [validation record](#validation-record) (`--validation`) validates it for the phone model, the phone, the OS build, the measurement revision and the app sources of the run. Without such a record, the driver measures the metric, the report shows its row as `unvalidated` with no verdict, and an expectation that selects it is `not decided`. The UI update metrics have no verdict, and their name does not say that they are frame durations.

| Metric | Unit | Source | Interval | Limits | Verdict |
| --- | --- | --- | --- | --- | --- |
| `uiUpdateDurationMedian`, `uiUpdateDurationP95` | ms | The app: a passive `UIUpdateLink` (iOS 18) of the window scene. A value is the time from the entry to the phase `beforeCADisplayLinkDispatch` to the entry to the phase `afterCATransactionCommit` of the same UI update, on one monotonic clock. | UI updates that begin and end in the sample window | It does not include the event handling before the display link callbacks, a manual commit after the update, the render server, the GPU and the display. It is not the same quantity as the `hitches-updates` table of Instruments: the cross-check only compares the median and the 95th percentile with that table. No verdict. | no verdict, shown |
| `uiUpdateDurationP90`, `uiUpdateDurationP99` | ms | The same as `uiUpdateDurationMedian` | UI updates that begin and end in the sample window | The same as `uiUpdateDurationMedian`. | no, stored |
| `missedDisplayLinkCallbacks` | share of display refreshes | `Σ max(0, round(gap / P) − 1) / Σ round(gap / P)` over the gaps between the model times (`UIUpdateInfo.modelTime`) of successive UI updates. `P` is 1 / `refreshRate` of the LAUNCH line. A gap that is more than 0.25 `P` from a whole number of periods is a tool error. An epoch in which each gap is 2 `P` or more is a tool error: the app then updates at a fraction of the display rate (for example 30 Hz on a 60 Hz display), and the share does not show it. | UI updates that begin and end in the sample window | An estimate from the gaps between updates only: it does not see the refreshes before the first update and after the last update of the window. A display refresh with no UI update of the app counts as missed. The update share of a scenario does not apply to it. | no verdict, shown |
| `frameCount`, `expectedFrameCount` | count | The number of UI updates in the window; `refreshRate` of the LAUNCH line times the length of the window | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | A sample with fewer UI updates than 90% of the expected count is invalid (cause `frames`). | no, stored |
| `uiThreadCpu` | ms for each s | `1000 × Δ(user + system time)` of `thread_info(THREAD_BASIC_INFO)` of the main thread, over the seconds between the midpoints of the two reads of this counter on the monotonic clock. The app keeps a Mach handle of the thread and compares the thread id (`THREAD_IDENTIFIER_INFO`) with `mainThread` of the LAUNCH line at each read. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | Microsecond resolution. CPU time does not show the core type or the clock rate: the same work takes more time on an efficiency core. | with a validation record |
| `jsThreadCpu` | ms for each s | The same for the JS thread. The app takes its Mach handle on the JS thread itself, in the synchronous TurboModule call `markReady` before READY, and the main thread reads it. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | Microsecond resolution. CPU time does not show the core type or the clock rate: the same work takes more time on an efficiency core. | with a validation record |
| `otherThreadsCpu`, `processCpu` | ms for each s | The process: user + system time of `getrusage(RUSAGE_SELF)`. The other threads: the process minus the main thread and the JS thread. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | It includes the threads that ended in the window. A process value that is less than the sum of the two threads by more than the read delay and the counter resolution is a tool error. Microsecond resolution. CPU time does not show the core type or the clock rate: the same work takes more time on an efficiency core. | no, stored |
| `mountBatchCount` | count | Calls of `didMountComponentsWithRootTag:` of an `RCTSurfacePresenterObserver` of the app, for all surfaces. React Native calls it after each `RCTPerformMountInstructions`. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | The work check of a scenario uses it. | no, stored |
| `memory` | kB | `phys_footprint` of `task_info(TASK_VM_INFO)` at the end read of the window | The end of the sample window: 10 s after READY | One value for each sample. | with a validation record |
| `windowMemoryDelta` | kB | `memory` minus the value at the start read of the window | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | Use it to see the trend in the window only. | no, stored |
| `coldStart` | ms | `coldStart` of the LAUNCH line. The app measures it. | From the start of the process (`p_starttime` of `sysctl`) to the first display link callback | The difference of two wall-clock times. It does not include the time before the kernel starts the process. No verdict and no noise limit. | no verdict, shown |

## Sign command

`--sign-command <path>` names an executable file. A relative path starts at the folder where you run the driver. The driver keeps each iOS build without a signature (`CODE_SIGNING_ALLOWED=NO`) and signs it for each new run:

- The driver calls `<path> <app> <ipa>` with two absolute paths: the unsigned `.app` folder of the build, and the `.ipa` file to write. The working folder is `<run folder>/signed/`, and the `.ipa` is in it.
- The command must write the `.ipa` with a development signature that the iPhone accepts and with the entitlement `get-task-allow`, because `crosscheck` attaches `xctrace` to the app.
- The command must not ask for input, and it must end with exit code 0 in 15 minutes.
- The driver writes the output of the command to `<ipa>.sign.log`. A missing `.ipa` is a tool error.

## Phone storage on iOS

`run`, `sample` and `observer-cost` make no Instruments recording, so the Instruments service of the phone does not allocate a trace for them. Their storage use on the phone is not measured.

`crosscheck` records with `xctrace` (the instruments Thread Activity, Hitches, `os_signpost` and Activity Monitor). On an iPhone 14 with iOS 27 and Xcode 27.2, the Instruments service of the phone (`DTServiceHub`) writes the kernel trace of each recording to a file on the phone and keeps that space while the service runs. The space does not come back at the end of the recording, and the driver does not free it. In one test of 10 s for all processes with the instruments Thread Activity, Hitches, Thermal State and `os_signpost`, the file had 346 MB, and the free space fell by 355 MB. The cost of Activity Monitor in this file is not measured. Check the free space of the phone before each `crosscheck`.

## Verdicts

- `better`: B is lower than A.
- `worse`: B is higher than A.
- `no change found`: the data does not show a difference.

`better` and `worse` need all of these conditions:

1. The 95% bootstrap interval of the difference of the medians does not include zero.
1. The row passes the Benjamini-Hochberg procedure at 0.05 over all verdict rows of the run. The p-value comes from an exact two-sided permutation test of the rank sum (Wilcoxon rank-sum).
1. The difference is larger than the noise limit of the row.

A share (`jankyFrames`, `missedDisplayLinkCallbacks`) is often near 0, so the driver compares it as an absolute difference, and the report gives it in percentage points (pp). The other metrics use the relative difference. When the median of A, or the median of A in a bootstrap draw, is 0 or less, the row uses the absolute difference, and the report marks it. Its noise limit is then the relative limit times the median of A, or no limit when that median is 0 or less.

## Stopped runs

A run stops on a tool error or an interrupt. The driver then writes `result.json` and `report.md` with the data that it has. The statistics use only the complete scenarios, and the Benjamini-Hochberg procedure counts each row of the other scenarios with p = 1. The report marks the verdicts as provisional and names the scenarios without data. An expectation that selects a scenario without data is `not decided`, but a `worse` row still makes it `fails`. `result.json` keeps the samples of the scenario in progress in `incompleteScenario`.

`run --resume <run folder> <device>` continues the run in the same folder:

- It uses the config, the blocks, the noise limits, the validation record and `--keep-traces` of `result.json`. The adb serial can change, but the phone must be the same.
- It stops when the run is `done`, when an install file (the APK, or the signed `.ipa`) is missing or changed (SHA-256 in `result.json`), when the tool versions changed, when the phone state changed, or when the measurement revision of the run is not the revision of the driver. A run cannot continue on the other platform.
- It does not build or sign. It installs A and B again. It keeps the complete scenarios and, in the incomplete scenario, the accepted blocks. It moves the other samples of that scenario to `abandonedScenarios`, and the count of invalid blocks starts at 0 again.
- The battery temperature at the start of the run stays the reference for the cool-down, and the refresh rate of the first sample stays the reference for the run.
- `result.json` and the report list each segment (one start of the driver) with its start, end, status and phone state. Each sample has the number of its segment.

## Memory test

`memory --config <file.json> --scenario <name> --serial <adb serial>` looks for a memory leak in one scenario on Android. It reads only `name`, `a`, `b` and `note` of the config.

1. The driver builds and installs A and B as `run` does.
1. It launches the app for each variant in turn: A, B, B, A, then B, A, A, B. `--launches` sets the number of launches for each variant (default 2).
1. After READY, it reads `dumpsys meminfo <application id>` every `--interval` seconds (default 60) for `--duration` seconds (default 1200). The duration must be a multiple of the interval and at least 4 intervals.
1. Each reading has the planned time, the measured time, the time of the command, the frame count of `dumpsys gfxinfo`, the battery level and temperature, and the total PSS, the native heap and Dalvik heap PSS, and the graphics, private other and total swap PSS in kB.
1. After the last reading, the driver records one trace and checks it as `run` does.

A launch is invalid when the app process stops or changes, or `dumpsys` finds no process (`crash`), when a reading comes more than half an interval late (`late`), when the frame counter was reset (`reset`), when the app draws fewer frames per second than 25% of the refresh rate between two readings (`drawing`), or when the check of the final trace fails. After an invalid launch, the driver repeats that launch only. After 3 invalid attempts of a launch in sequence, the test fails.

For each accepted launch, `tailLevel` is the median total PSS of the readings at or after 75% of the duration, and `tailSlope` is the least-squares slope of total PSS over the readings at or after 50% of the duration, in kB per minute. The verdict of each variant is `rises` (the `tailSlope` of each launch is above `--slope-limit`, default 1000 kB per minute), `no rise found` (each is at or below the limit), `mixed`, `not decided` (fewer accepted launches than `--launches`), or `not judged (duration under 600 s)`.

The report gives the limits of the test: few launches and no confidence interval, `no rise found` does not prove that there is no leak, a rise slower than the slope limit and a late drop of memory stay hidden, and the verdict uses total PSS only. The exit code is 0 for `rises`, `no rise found` and `not judged`, 1 for `mixed` or `not decided`, and 2 for a tool error.

The device rules of `run` apply, but the test does not compare the battery level. `memory --resume <run folder> --serial <adb serial>` continues a stopped test. It keeps all valid launches and starts the launch in progress again.

## CI

The workflows run the driver on a self-hosted macOS runner with a cabled phone:

- `benchmark-run.yml` (`workflow_call`) checks its inputs, packs Reanimated and Worklets of the checkout when a side is `checkout` (`npm pack`), writes the config (`.github/workflows/helper/benchmark-config.ts`), runs the driver with `--output-dir`, uploads the output folder as an artifact, adds `report.md` to the job summary and ends with the exit code of the driver. `checkout` is the commit that the workflow checked out, and the config note has its SHA. An empty Worklets input takes the newest published version that `compatibility.json` gives for the Reanimated version. `scenarios: all` gives the scenarios that need no static flag. With `shared-element-transitions: true`, the config sets `ENABLE_SHARED_ELEMENT_TRANSITIONS` to `true` in A and B, and `all` also gives `shared-elements`. Each run attempt has its own work folder. Two runs on one phone do not overlap: the concurrency group of the phone keeps a new run waiting and does not cancel the run in progress.
- `benchmark-manual.yml` (`workflow_dispatch`) calls it with the inputs that you give. `checkout` is the commit of the branch that you select.
- `benchmark-nightly.yml` runs each night on the default branch. It compares the latest stable release with `checkout` in two calls: the scenarios without a static flag, then `shared-elements` with `shared-element-transitions: true`.

The workflows have no secrets, signing keys or provisioning profiles, and no `pull_request` trigger. A maintainer sets up:

1. A runner with the labels `self-hosted`, `macOS` and the phone label, for example `pixel-8`. One phone label must select one runner with one cabled phone.
1. On the runner: the tools of [Tools](#tools), and Rust (`cargo`), because `npm pack` of Worklets builds its Rust plugin.
1. A GitHub environment `benchmark-<phone label>` with the variables `BENCHMARK_DEVICE_ID` (the adb serial or the UDID), `BENCHMARK_NOISE_LIMITS_DIR` (a folder on the runner) and, for an iPhone, `BENCHMARK_SIGN_COMMAND` (the absolute path of the sign command).
1. A deployment branch rule on that environment that permits only the default branch and the release branches (`*-stable`). The job runs repository code on a self-hosted runner.
1. For an iPhone, a sign command under the runner account, outside the repository, with the contract of [Sign command](#sign-command). The signing identity and the profiles stay on the runner.
1. The noise limits records: `<BENCHMARK_NOISE_LIMITS_DIR>/<name>.json`. Make each record with an A/A run on that phone (for example with `benchmark-manual.yml` and the same A and B), then `noise-limits` on the run folder of the artifact (see [Calibration](#calibration)). The `noise-limits` input is `<name>`: letters, digits, `.`, `_` or `-`.
1. For the nightly workflow, the repository variables `BENCHMARK_NIGHTLY_ENABLED` (`true` turns it on), `BENCHMARK_NIGHTLY_PLATFORM`, `BENCHMARK_NIGHTLY_PHONE` and `BENCHMARK_NIGHTLY_NOISE_LIMITS`. They are repository variables, because the nightly workflow reads them before a job selects the environment.

## Validation of the iOS collector

Three commands validate the in-app collector of iOS on one phone. `crosscheck` and `observer-cost` measure; their output is not a benchmark sample. Each needs an installed app that the driver built (for example the signed `.ipa` of a run, installed with `xcrun devicectl device install app`), because the record compares the hash of the app sources. `validation-record` reads their folders and writes the record that `run --validation` uses.

### Cross-check

`crosscheck` launches the app with a plan of epochs that starts on a Darwin notification, records the app with `xctrace` (the instruments Thread Activity, Hitches, `os_signpost` and Activity Monitor, for the length of the plan and 3 s), and posts the notification when `xctrace` writes that the recording started. `--epochs` gives each epoch as `<load>:<collector>:<seconds>`. The collector is `full` (counter reads, UI updates and mount count) or `endpoints` (only the counter reads). When the recording fails or the app ends, the driver stops the wait for the `SAMPLE` line and stops the app.

The app writes a `Boundary` signpost after the counter reads at each epoch boundary, between two clock reads. The driver maps the clock of the app to the clock of the trace with the median offset of these signposts from the middle of their two clock reads. A spread of the offsets of more than 1 ms is a tool error. The clock uncertainty is the largest distance of an offset from the median, plus the half width of its clock reads. The driver moves the span of each counter read to the trace and compares for each epoch:

- `uiThreadCpu`, `jsThreadCpu` and `processCpu` with the `Running` time of the table `thread-state` in the span of the same counter: within max(1 ms/s, 2%) plus the timing uncertainty. The timing uncertainty is the uncertainty of the counter reads and two times the clock uncertainty, over the span. The report gives it next to each error.
- `mountBatchCount` with the starts of the React Native section `RCTPerformMountInstructions`: exact.
- The work of the load: in `crosscheck-load`, each load counts its work units for the current epoch. A `ui-stall`, `js-load` or `render-heavy` epoch must have its own units in at least half of the display refreshes of the epoch, and each epoch must have units of the other loads in at most 10% of them.
- The median and the 95th percentile of the UI update durations with the rows of `hitches-updates`: within max(0.25 ms, 5%). The two quantities are not the same (see the metric table), so a pass says only that these quantiles are within the tolerance.
- `phys_footprint` at each boundary with `memory-physical-footprint` (bytes) of the table `activity-monitor-process-live` at the same time: within max(1024 kB, 2%). The driver interpolates between the two Activity Monitor rows around the boundary, and it uses no row that is more than 2 s away. With fewer than 2 boundaries that have a value, memory is `not available`.

The scenario can be a benchmark scenario, or the validation scenario `crosscheck-load` of the app. In `crosscheck-load`, the load of each epoch is `idle`, `ui-stall` (6 ms of busy work on the UI thread on each display refresh, from a display link of the app), `js-load` (6 ms of busy work on the JS thread in each animation frame) or `render-heavy` (a new render of all views in each animation frame). The folder has `crosscheck.json` (all values with the signed, absolute and relative errors and the timing uncertainty), `crosscheck.md` and the trace. The exit code is 0 when the counters pass and the loads ran.

Each plan below measures 10 s, as a sample of `run` does:

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts crosscheck --udid <UDID> \
  --package com.reanimatedbenchmark.a --scenario worklet-styles-transform \
  --epochs steady:full:2.5,steady:endpoints:2.5,steady:endpoints:2.5,steady:full:2.5
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts crosscheck --udid <UDID> \
  --package com.reanimatedbenchmark.a --scenario crosscheck-load \
  --epochs idle:full:2.5,ui-stall:full:2.5,js-load:full:2.5,render-heavy:full:2.5
```

### Observer cost

`observer-cost` measures the cost of the collector without Instruments. It takes `--blocks` blocks (at least 5, default 5) of 4 samples: full collector, only the counter reads, only the counter reads, full collector. For `uiThreadCpu`, `jsThreadCpu`, `processCpu` and `memory` (the footprint at the end read), it gives the medians of the two modes, their relative difference and its 95% interval. The bootstrap of the interval draws whole blocks with their four samples (seed 20261114, 10000 draws). With `--noise-limits`, the driver checks the version and the load of the scenario that each launch reports against the record, and the allowed band of a metric is one quarter of its noise limit:

- `passed`: the interval is inside the band.
- `failed`: the interval is fully outside the band.
- `not validated`: the interval crosses a bound (take more blocks), the metric has no noise limit, or the test has fewer than 5 blocks.

The exit code is 0 only when each verdict metric is `passed`. The folder has `observer-cost.json` and `observer-cost.md`.

### Validation record

`validation-record --crosscheck <folder> ... --observer-cost <folder> ...` writes a record to stdout. All folders must have one platform, phone model, phone, OS build, measurement revision and app sources hash, or the command stops. The record has `formatVersion` (1), these values, `sources` (the folders) and, for each verdict metric, `validated` and its gates with their result (`passed`, `failed` or `not validated`). A metric is validated only when each gate passes:

1. At least 2 cross-checks and observer-cost tests of at least 2 scenarios.
1. In each cross-check: the thermal state stayed `Nominal`. For a CPU metric also the loads ran, and the metric passed in each epoch. For `memory` also the footprint passed against Activity Monitor.
1. In each observer-cost test: the metric is `passed`.

`run --validation <record>` uses the record when its platform, phone model, phone, OS build, measurement revision and app sources hash are the values of the run. The run stores the record in `result.json`, and the report names the validated metrics and the reason for the others.

## Not supported

- An iOS simulator: the driver measures only on a real iPhone. On Android, use a real phone too.
- On iOS: iOS 17 or older, the `memory` command, `"profiling": true`, `--keep-traces` and `--keep-trace`, a display with a variable refresh rate or a maximum rate other than 60 Hz, a battery temperature, and the thermal state while no app runs.
- `"bundleMode": true`.
- A comparison of numbers or verdicts across platforms, phones or measurement revisions.
