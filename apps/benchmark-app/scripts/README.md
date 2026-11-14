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

Connect an iPhone with a display of 60 Hz, with Developer Mode on, paired with the Mac and unlocked. Get its UDID from `xcrun devicectl list devices`. Write a [sign command](#sign-command) and a config, for example `.tmp/benchmarks/configs/ios-css.json`:

```json
{
  "name": "ios-css",
  "a": { "reanimated": "4.7.1", "worklets": "0.13.1" },
  "b": { "reanimated": "./react-native-reanimated-4.8.0.tgz", "worklets": "0.13.1" },
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
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> <device> [--blocks 5] [--noise-limits <file.json>] [--output-dir <dir>] [--keep-traces] [--trace-processor <path>] [--sign-command <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --resume <run folder> <device> [--trace-processor <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --config <file.json> --scenario <name> --serial <adb serial> [--output-dir <dir>] [--launches 2] [--interval 60] [--duration 1200] [--slope-limit 1000] [--keep-traces] [--trace-processor <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --resume <run folder> --serial <adb serial> [--trace-processor <path>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits --runs <run folder> [<run folder> ...]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts sample <device> --package <application id> --scenario <name> [--load <integer>] [--keep-trace] [--trace-processor <path>]
```

- `<device>` is `--serial <adb serial>` (Android) or `--udid <UDID>` (iOS).
- `--trace-processor` is for Android only. `--sign-command` is for iOS only, and an iOS `run` needs it.
- `run` builds A and B, installs them and measures each scenario of the config in blocks. A block measures A, B, B, A, and each second block measures B, A, A, B. `--blocks` sets the number of blocks for each scenario.
- `run --resume` continues a run that is not `done`. See [Stopped runs](#stopped-runs).
- `memory` reads the memory of A and B in one scenario for a long time. See [Memory test](#memory-test).
- `noise-limits` reads A/A runs and writes a noise limits record to stdout. See [Calibration](#calibration).
- `sample` measures one scenario of an installed app one time and writes the metrics as JSON to stdout. Use it to find the load of a scenario.

## Config

- `name`: letters, digits, `.`, `_` or `-`. The run folder has this name.
- `a`, `b`: the two variants. `reanimated` and `worklets` are an exact npm version or a path to a tarball from `npm pack`. A relative path starts at the folder of the config.
- `reanimatedFlags`, `workletsFlags` (optional): static flags. The other flags keep the defaults of the installed library. An unknown flag is a tool error.
- `profiling: true` (optional, Android only) builds with the profiling Gradle properties. `bundleMode: true` is not supported.
- `scenarios`: one or more scenario names of the [benchmark app](../README.md#scenarios).
- `blocks` (optional): the number of blocks for a scenario. It replaces `--blocks` for that scenario.
- `expect` (optional): a list of entries with `scenarios` (default: all), `metrics` (default: all verdict metrics of the platform), `is` (`notWorse` or `better`) and `byAtLeast` (a fraction, only with `better`). The default is `[{ "is": "notWorse" }]`.
- `note` (optional): a text for the report.

The driver stops before it builds when the config has an unknown field, scenario or metric.

## Tools

- Node from `.nvmrc` and Yarn 4.
- Android: the Android SDK (`ANDROID_HOME`, or the default SDK folder), `adb` (SDK `platform-tools`, or `PATH`), a JDK for Gradle, and `trace_processor_shell` of Perfetto (`--trace-processor`, then `TRACE_PROCESSOR_SHELL`, then `PATH`).
- iOS: Xcode with `xcodebuild`, `xctrace` and `devicectl` (tested with Xcode 27.2), Ruby and Bundler for CocoaPods, and a [sign command](#sign-command).

## Calibration

The noise limit of a verdict row is the difference that the driver gets between two equal builds. Make the limits for each phone model, platform and measurement revision:

1. Write a config with the same `a` and `b` (an A/A config) and the scenarios to calibrate.
1. Run it: `run --config <aa.json> <device>`. More blocks give better limits.
1. Make the record: `noise-limits --runs <run folder> [<run folder> ...] > .tmp/benchmarks/noise-limits/<phone>.json`.
1. Give the record to each run on this phone model: `--noise-limits <record>`.

The record has `formatVersion` (1), `platform`, `device` (`model`, `deviceId`, `osBuild`), `measurementRevision`, `sources` (each run folder with the accepted samples of A and B for each scenario) and `limits` (`{ "<scenario>": { "<metric>": <limit> } }`). A limit is a fraction for a relative metric and a share of frames for `jankyFrames` (0.005 is 0.5 percentage points).

For each scenario and verdict metric, `noise-limits`:

1. puts the accepted samples of A and B in one group,
1. divides the group in all possible ways into two groups with the sizes of A and B (above 200000 ways, 20000 random ways with a fixed seed),
1. compares the medians of the two groups as the verdict does,
1. takes the 97.5th percentile of the absolute differences, but not less than the floor: 0.02 for a relative metric and 0.005 for `jankyFrames`.

When the relative difference is not defined for a division (a median of 0 or less), the record has no limit for that metric. The runs must have the same platform, device and measurement revision, and a scenario must be in one run only. The runs do not have to be `done`: the command uses their complete scenarios. A run is A/A when A and B have the same sources, installed versions, effective flags and build options.

`run` stops when the record has another platform, another phone model or another measurement revision. A run without `--noise-limits` is uncalibrated: the limit of each row is 0, and the report says so.

## Output

- Builds: `.tmp/benchmarks/builds/<key>/`. The driver builds a variant again only when its key changes. The key has the variant (sources, tarball hashes, flags, build options), the application id suffix, the files of the app project (with `yarn.lock`), the build procedure of the driver, the Node version and the build tools: on Android the JDK (`java -version`) and the NDK and build tools revisions of `android/build.gradle`, on iOS the Xcode version and the `iphoneos` SDK version and build. The key does not have the dependency versions that `yarn add` resolves in the build copy, because the driver knows them only after the build.
- Runs: `<output dir>/<date>-<name>/`, and `<output dir>/<date>-<name>-memory-<scenario>/` for a memory test. The output dir is `--output-dir`, or `.tmp/benchmarks/runs/`. The folder has `result.json` (all samples and statistics), `report.md`, `summary.json`, and `traces/` with the trace of each invalid sample (all traces with `--keep-traces`). An iOS run folder also has `signed/` with the signed apps. `sample` writes its trace to `.tmp/benchmarks/samples/`.
- `result.json` has the format version 1. The driver writes it after each sample. Another version, or a missing or wrong field that the driver reads, is a tool error.
- `summary.json` (format version 1) has the `command`, the `status`, the `exitCode` and its `reason`, the expectations that do not hold (`failedExpectations`), the count of each verdict (`verdictCounts`), and the relative paths of `report.md` and `result.json`. The driver writes it at the end of each segment, also after a tool error (exit code 2) or an interrupt (exit code 130 or 143). An error before the run folder exists, for example an invalid config, gives no run folder.
- Exit code of `run`: 0 when all expectations hold, 1 when an expectation fails or is not decided, 2 for a tool error.

## Measurement

For each sample, the driver stops the apps, waits for a cool phone, launches the app in the scenario, waits for the READY line of the app, records a trace of 10 s and computes the metrics from the trace.

- The measurement revision (`measurement-rules.mts`) names the rules of collection, parsing and acceptance. The driver stores it in each result and in each noise limits record. Numbers and verdicts are valid only within one platform, one phone and one measurement revision.
- A sample is invalid when the app crashes before or during the trace (`crash`), when the phone is hot (`thermal`), when the app draws fewer than 90% of the expected frames (`frames`), or when the app does less work than the scenario needs (`work`). The driver then measures the block again. After 3 invalid blocks in sequence, the scenario fails, and the report gives the cause and the detail of each of the 3 blocks.
- Each scenario declares its requirements in `scenarios.mts`. The update share is the share of the display refreshes in which the app updates its views: 1 for each scenario except `idle-cost` (0.5). The work check is the minimum `mountBatchCount` in one recording of 10 s. Only `shared-elements` has one: 300. Basis: in the first runs, a working sample had 574 to 628 (Samsung Galaxy A16) and 588 to 710 (iPhone 13 mini), and a sample with stopped transitions had 38.
- Each platform declares its verdict metrics and its advisory metrics (`android-definition.mts`, `ios-definition.mts`). The report shows an advisory metric with its difference and interval and "no verdict". It has no noise limit, and an expectation cannot select it. The report of each run defines the metrics of its verdict table.
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
| `frameCyclesMedian`, `frameCyclesP95` | Mcycles (10^6 CPU cycles) | Estimated cycles of the main thread in each frame: for each complete `Choreographer#doFrame` slice, the sum of the duration of each scheduling slice of the main thread in it times the clock rate of its CPU at that time | Slices that start and end in the trace window | The phone lowers the clock rate under load, so a frame can take more time with less work; these values show the work. `null` when less than 95% of the running time in the frames has a known clock rate. A scheduling slice that is open at the end of the trace does not count. No verdict. | no verdict, shown |
| `frameCyclesCoverage` | share | Share of the running time of the main thread in the complete frames that has a known clock rate | Slices that start and end in the trace window | `null` when the frames have no running time. | no, stored |
| `jankyFrames` | share of frames | `max(0, 1 - frameCount / expectedFrameCount)` | Trace window: from the start of all data sources to the end of the recording of 10 s | Counts the refreshes without a frame of the app. A slow frame that the app still draws does not count. | yes |
| `frameCount`, `expectedFrameCount` | count | Count of the `Choreographer#doFrame` slices on the main thread; the refresh rate of the display times the length of the trace window | Trace window: from the start of all data sources to the end of the recording of 10 s | Each scenario requests a frame on each refresh, also `idle-cost`. The expected count does not use the update share of the scenario. | no, stored |
| `uiThreadCpu` | ms for each s | Perfetto `sched` slices of the main thread of the app | Trace window: from the start of all data sources to the end of the recording of 10 s. A slice is cut to the window. | CPU time does not show a change of the clock rate. | yes |
| `jsThreadCpu` | ms for each s | Perfetto `sched` slices of the JS thread (`jsThread` of the READY line) | Trace window: from the start of all data sources to the end of the recording of 10 s. A slice is cut to the window. | CPU time does not show a change of the clock rate. | yes |
| `renderThreadCpu`, `otherThreadsCpu`, `processCpu` | ms for each s | Perfetto `sched` slices of `RenderThread`, of the other threads of the app, and of all threads of the app | Trace window: from the start of all data sources to the end of the recording of 10 s. A slice is cut to the window. | CPU time does not show a change of the clock rate. | no, stored |
| `uiThreadCpuWork`, `processCpuWork` | MHz·ms for each s (1 MHz·ms is 1000 CPU cycles) | Duration of each scheduling slice times the clock rate of its CPU at that time, for the main thread and for all threads of the app. The same integral as `frameCyclesMedian`, which gives the values of `cpu_cycles_per_thread_in_interval` of the Perfetto standard library. | Trace window: from the start of all data sources to the end of the recording of 10 s. A slice is cut to the window. | CPU time without a known clock rate (for example before the first clock rate value of its CPU) does not count. A scheduling slice that is open at the end of the trace does not count. `null` when no running time has a known clock rate. | no, stored |
| `mountBatchCount` | count | Count of the `IntBufferBatchMountItem::mountViews` slices of the app | Slices that start in the trace window | The work check of a scenario uses it. | no, stored |
| `memory` | kB | Last value of `mem.rss.anon` plus `mem.swap` of the app (`linux.process_stats`, each 1000 ms) | Trace window: from the start of all data sources to the end of the recording of 10 s | One value near the end of the window. | yes |
| `windowMemoryDelta` | kB | Last value minus first value of `memory` | Trace window: from the start of all data sources to the end of the recording of 10 s | The window is in the first minutes after the launch. Use the memory test to find a leak. | no, stored |
| `coldStart` | ms | `TotalTime` of `am start -W` | From the launch intent to the first frame of the activity | Ends before React Native shows content. One value for each launch. | yes |
| `drawFrameMedian`, `drawFrameP95` | ms | Duration of the `DrawFrame` slices on `RenderThread` | Slices that start in the trace window | `null` when the window has no slice. | no, stored |
| `frameTimelineDurationMedian`, `frameTimelineDurationP95`, `frameTimelineFrameCount` | ms; count | Duration and count of the frame timeline rows of the app | Rows that start in the trace window | On some phones each frame has the jank type "Buffer Stuffing", and the durations change in steps of one refresh period. | no, stored |
| `jankFlaggedFrames`, `appDeadlineMissedFrames` | share of frames | Share of the frame timeline rows with a jank type, and with the jank type `App Deadline Missed` | Rows that start in the trace window | `null` when the window has no row. | no, stored |

### iOS

- Before each sample, the driver reads the UDID, the product type and the OS build with `devicectl`. A change stops the run.
- The driver does not read the thermal state or the battery of the iPhone while no app runs. The app gives them: the LAUNCH line gives the thermal state, and each `State` signpost gives the battery level, the battery state, the low power mode and the brightness. When the thermal state at the launch is above `Nominal`, the driver stops the app, waits 30 s and launches it again; after 10 minutes, the run stops. A `State` value that is not the value of the first sample of the run stops the run.
- After each install, the driver launches the app one time and stops it, because the first launch after an install is slow.
- `xctrace record` attaches to the app for 10 s with the template `Animation Hitches`, the instrument `os_signpost`, and the signposts of React Native (`dev.reactnative.instruments`) and of the app (`com.reanimatedbenchmark`). Then the driver stops the app and exports the tables of the trace with `xctrace export`.
- The trace window goes from the first to the last `State` signpost in the longest time in which the table `thread-state` gives a known state of the main thread and of the JS thread. A row that starts at 0 gives the state before the scheduler data starts, so it does not count. A window shorter than 8 s (80% of the recording) is a tool error. Each sample stores its window (`traceWindow`).
- In `thread-state`, only `Running` is CPU time. The driver knows the states of the Instruments schema: `Running`, `Runnable`, `Preempted`, `Throttled`, `Interrupted`, `Blocked`, `Idle`, `Terminated` and `Unknown`. Another state, a row without a thread id, a duration of 0 or less, or a missing column is a tool error.
- `thermal`: the table `device-thermal-state-intervals` or a `State` signpost shows a state above `Nominal`. `crash`: the app writes `FAILED`, the console command ends before READY or during the trace, or the main thread ends in the trace.
- These are tool errors: a launch command that does not start the app, a READY line without a LAUNCH line or without `jsThread`, and a display whose maximum refresh rate is not 60 Hz. A LAUNCH or READY line that comes at or after its time limit of 60 s does not count. After each launch, the driver stops the console and the app, also after a tool error.
- The trace has the cost of the Time Profiler samples of the template, of the React Native signposts and of the `State` signposts. A and B have the same tools, but the driver does not measure this cost.

| Metric | Unit | Source | Interval | Limits | Verdict |
| --- | --- | --- | --- | --- | --- |
| `frameDurationMedian`, `frameDurationP95` | ms | `xctrace`: duration of the rows of the table `hitches-updates` of the app. A row is the update phase of one frame: the work of the app on its main thread to the end of the commit. | Rows that are fully in the trace window | The render phase and the display are not in it. | yes |
| `frameDurationP90`, `frameDurationP99` | ms | The same as `frameDurationMedian` | Rows that are fully in the trace window | The same as `frameDurationMedian`. | no, stored |
| `jankyFrames` | share of frames | `max(0, 1 - frameCount / expectedFrameCount)` | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the main thread and the JS thread | Counts the expected updates that did not come. A display with a variable refresh rate is not supported. | yes |
| `frameCount`, `expectedFrameCount` | count | Count of the `hitches-updates` rows; `refreshRate` of the LAUNCH line times the length of the trace window times the update share of the scenario | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the main thread and the JS thread | A frame without an update of the app has no row, so the expected count uses the update share (0.5 for `idle-cost`). | no, stored |
| `uiThreadCpu` | ms for each s | Time in the state `Running` of the main thread (`mainThread` of the LAUNCH line) in the table `thread-state` | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the main thread and the JS thread. An interval is cut to the window. | The table has no clock rate. The same work takes more time on an efficiency core. | yes |
| `jsThreadCpu` | ms for each s | The same for the JS thread (`jsThread` of the READY line) | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the main thread and the JS thread. An interval is cut to the window. | The table has no clock rate. The same work takes more time on an efficiency core. | yes |
| `otherThreadsCpu`, `processCpu` | ms for each s | The same for the other threads of the app, and for all threads of the app | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the main thread and the JS thread. An interval is cut to the window. | The table has no clock rate. The same work takes more time on an efficiency core. | no, stored |
| `uiThreadEfficiencyCoreShare` | share | Share of `uiThreadCpu` on efficiency cores | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the main thread and the JS thread | `null` when the main thread did not run, or when a `Running` interval has no known core type. | no, stored |
| `mountBatchCount` | count | Count of the starts of the React Native section `RCTPerformMountInstructions` | Starts in the trace window | The work check of a scenario uses it. | no, stored |
| `memory` | kB | `phys_footprint` of the app in the `State` signpost at the end of the trace window | The end of the trace window | The time from the launch to this moment changes with the start time of `xctrace` (some seconds). | yes |
| `windowMemoryDelta` | kB | `memory` minus the value in the `State` signpost at the start of the trace window | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the main thread and the JS thread | Use it to see the trend in the window only. | no, stored |
| `coldStart` | ms | `coldStart` of the LAUNCH line. The app measures it. | From the start of the process (`p_starttime` of `sysctl`) to the first display link callback | The difference of two wall-clock times. It does not include the time before the kernel starts the process. No verdict and no noise limit. | no verdict, shown |
| `hitchCount`, `hitchTime` | count; ms for each s | Count of the rows of the table `hitches` of the app, and the sum of their durations | Rows that overlap the trace window, cut to the window | No verdict. | no, stored |

## Sign command

`--sign-command <path>` names an executable file. A relative path starts at the folder where you run the driver. The driver keeps each iOS build without a signature (`CODE_SIGNING_ALLOWED=NO`) and signs it for each new run:

- The driver calls `<path> <app> <ipa>` with two absolute paths: the unsigned `.app` folder of the build, and the `.ipa` file to write. The working folder is `<run folder>/signed/`, and the `.ipa` is in it.
- The command must write the `.ipa` with a development signature that the iPhone accepts and with the entitlement `get-task-allow`, because `xctrace` attaches to the app.
- The command must not ask for input, and it must end with exit code 0 in 15 minutes.
- The driver writes the output of the command to `<ipa>.sign.log`. A missing `.ipa` is a tool error.

## Phone storage on iOS

The Instruments service of the iPhone keeps about 0.3 GB of trace data for each `xctrace` recording until the service ends. The driver cannot delete it. A restart of the phone is the only known way to free it. Plan a free storage of 0.3 GB times the number of samples: a run of 7 scenarios with 5 blocks of 4 samples needs at least 42 GB. Each run and each resume segment installs the apps first, and a failed install is a tool error that names this cause.

## Verdicts

- `better`: B is lower than A.
- `worse`: B is higher than A.
- `no change found`: the data does not show a difference.

`better` and `worse` need all of these conditions:

1. The 95% bootstrap interval of the difference of the medians does not include zero.
1. The row passes the Benjamini-Hochberg procedure at 0.05 over all verdict rows of the run. The p-value comes from an exact two-sided permutation test of the rank sum (Wilcoxon rank-sum).
1. The difference is larger than the noise limit of the row.

`jankyFrames` is often near 0, so the driver compares it as an absolute difference, and the report gives it in percentage points (pp). The other metrics use the relative difference. When the median of A, or the median of A in a bootstrap draw, is 0 or less, the row uses the absolute difference, and the report marks it. Its noise limit is then the relative limit times the median of A, or no limit when that median is 0 or less.

## Stopped runs

A run stops on a tool error or an interrupt. The driver then writes `result.json` and `report.md` with the data that it has. The statistics use only the complete scenarios, and the Benjamini-Hochberg procedure counts each row of the other scenarios with p = 1. The report marks the verdicts as provisional and names the scenarios without data. An expectation that selects a scenario without data is `not decided`, but a `worse` row still makes it `fails`. `result.json` keeps the samples of the scenario in progress in `incompleteScenario`.

`run --resume <run folder> <device>` continues the run in the same folder:

- It uses the config, the blocks, the noise limits and `--keep-traces` of `result.json`. The adb serial can change, but the phone must be the same.
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

- `benchmark-run.yml` (`workflow_call`) packs Reanimated and Worklets from the commit when a side is `main` (`npm pack`), writes the config (`.github/workflows/helper/benchmark-config.ts`), runs the driver with `--output-dir`, uploads the output folder as an artifact, adds `report.md` to the job summary and ends with the exit code of the driver. An empty Worklets input takes the newest published version that `compatibility.json` gives for the Reanimated version. Two runs on one phone do not overlap: the concurrency group of the phone keeps a new run waiting and does not cancel the run in progress.
- `benchmark-manual.yml` (`workflow_dispatch`) calls it with the inputs that you give.
- `benchmark-nightly.yml` compares the latest stable release with `main` each night. It does nothing until the repository variable `BENCHMARK_NIGHTLY_ENABLED` is `true`. The variables `BENCHMARK_NIGHTLY_PLATFORM`, `BENCHMARK_NIGHTLY_PHONE` and `BENCHMARK_NIGHTLY_NOISE_LIMITS` give its inputs.

Runner setup:

1. Give the runner the labels `self-hosted`, `macOS` and the name of the phone model (the `phone` input, for example `pixel-8`).
1. Install the tools of [Tools](#tools), and Rust (`cargo`) to pack Worklets from `main`.
1. Make a GitHub environment `benchmark-<phone>` with the variables `BENCHMARK_DEVICE_ID` (the adb serial or the UDID), `BENCHMARK_NOISE_LIMITS_DIR` (a folder on the runner with `<name>.json` noise limits records) and, for an iPhone, `BENCHMARK_SIGN_COMMAND` (the path of the sign command on the runner).

The workflows have no secrets, signing keys or provisioning profiles, and no `pull_request` trigger.

## Not supported

- An iOS simulator: the driver measures only on a real iPhone. On Android, use a real phone too.
- On iOS: the `memory` command, `"profiling": true`, a display with a variable refresh rate or a maximum rate other than 60 Hz, a battery temperature, and the thermal state while no app runs.
- `"bundleMode": true`.
- A comparison of numbers or verdicts across platforms, phones or measurement revisions.
