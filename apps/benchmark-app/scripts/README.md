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

Without `--validation`, this run gives no verdict for `processInstructionRate`: the report marks its rows `unvalidated`, and an expectation that selects it is `not decided`. A run gets this verdict only with a validation record of the phone (see the [iOS validation sequence](#ios-validation-sequence)).

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
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts observer-cost --udid <UDID> --package <application id> --scenario <name> [--blocks 10] [--noise-limits <file.json>] [--load <integer>] [--output-dir <dir>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts known-work --udid <UDID> --package <application id> [--output-dir <dir>]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts validation-record --known-work <folder> [--known-work <folder> ...] --observer-cost <folder> [--observer-cost <folder> ...] [--crosscheck <folder> ...] [--earlier-crosscheck <folder> ...]
```

- `<device>` is `--serial <adb serial>` (Android) or `--udid <UDID>` (iOS).
- `--trace-processor`, `--keep-traces` and `--keep-trace` are for Android only. `--sign-command` and `--validation` are for iOS only, and an iOS `run` needs `--sign-command`.
- `run` builds A and B, installs them and measures each scenario of the config in blocks. A block measures A, B, B, A, and each second block measures B, A, A, B. `--blocks` sets the number of blocks for each scenario, from 1 to 50, because the exact rank-sum test takes more time and memory for larger groups (about 1.9 s for 100 samples of each variant in one row).
- `run --resume` continues a run that is not `done`. See [Stopped runs](#stopped-runs).
- `memory` reads the memory of A and B in one scenario for a long time. See [Memory test](#memory-test).
- `noise-limits` reads A/A runs and writes a noise limits record to stdout. See [Calibration](#calibration).
- `sample` measures one scenario of an installed app one time and writes the metrics as JSON to stdout. Use it to find the load of a scenario.
- `known-work`, `observer-cost` and `crosscheck` (iOS only) validate the in-app collector of iOS, and `validation-record` writes a validation record from their folders to stdout. `crosscheck` is optional, and it records with Instruments. See [Validation of the iOS collector](#validation-of-the-ios-collector).

## Config

- `name`: letters, digits, `.`, `_` or `-`. The run folder has this name.
- `a`, `b`: the two variants. `reanimated` and `worklets` are an exact npm version or a path to a tarball from `npm pack`. A relative path starts at the folder of the config.
- `reanimatedFlags`, `workletsFlags` (optional): static flags. The other flags keep the defaults of the installed library. An unknown flag is a tool error. A scenario that needs a static flag (`shared-elements` needs `ENABLE_SHARED_ELEMENT_TRANSITIONS`) needs the flag set to `true` in both variants. The driver does not know the default of a flag in a library version, so it stops before it builds when a variant does not set the flag.
- `profiling: true` (optional, Android only) builds with the profiling Gradle properties. `bundleMode: true` is not supported.
- `scenarios`: one or more scenario names of the [benchmark app](../README.md#scenarios).
- `blocks` (optional): the number of blocks for a scenario, from 1 to 50. It replaces `--blocks` for that scenario.
- `expect` (optional): a list of entries with `scenarios` (default: all), `metrics` (default: all verdict metrics of the platform), `is` (`notWorse` or `better`) and `byAtLeast` (a fraction, only with `better` and only for metrics with a relative difference). The default is `[{ "is": "notWorse" }]`.
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

The record has `formatVersion` (1), `platform`, `device` (`model`, `deviceId`, `osBuild`), `measurementRevision`, `sources` (each run folder with the accepted samples of A and B for each scenario), `scenarios` (`{ "<scenario>": { "version": <integer>, "load": <integer> } }` from the READY lines of the accepted samples) and `limits` (`{ "<scenario>": { "<metric>": <limit> } }`). A limit is a fraction for a relative metric and a share for an absolute metric (`jankyFrames`; 0.005 is 0.5 percentage points). A limit must be a finite number of at least the noise floor of its metric.

For each scenario and verdict metric, `noise-limits`:

1. puts the accepted samples of A and B in one group,
1. divides the group in all possible ways into two groups with the sizes of A and B (above 200000 ways, 20000 random ways with a fixed seed),
1. compares the medians of the two groups as the verdict does,
1. takes the 97.5th percentile of the absolute differences, but not less than the floor: 0.02 for a relative metric and 0.005 for an absolute metric.

When the relative difference is not defined for a division (a median of 0 or less), the record has no limit for that metric. The runs must have the same platform, device and measurement revision, a scenario must be in one run only, and the accepted samples of a scenario must have one version and one load. The runs do not have to be `done`: the command uses their complete scenarios. A run is A/A when A and B have the same sources, installed versions, `yarn.lock`, effective flags, build options and app build identity.

`run` stops when the record has another platform, another phone model or another measurement revision, and when the app reports another version or load of a scenario than the record. A verdict row without a limit in the record has the noise floor of its metric as its limit (0.02 for a relative metric, 0.005 for a share), and the report marks its verdict `(uncalibrated)`. A run without `--noise-limits` is uncalibrated: the limit of each row is the noise floor of its metric, and the report says so.

## Output

- Builds: `.tmp/benchmarks/builds/<key>/`. The driver builds a variant again only when its key changes. The key has the variant (sources, tarball hashes, flags, build options), the application id suffix, the files of the app project (with `yarn.lock`), the build procedure of the driver, the Node version and the build tools: on Android the JDK (`java -version`) and the NDK and build tools revisions of `android/build.gradle`, on iOS the Xcode version and the `iphoneos` SDK version and build. The build key cannot contain the transitive versions that `yarn add` resolves. The SHA-256 of the resolved `yarn.lock` of the build copy (`lockfileSha256` of each variant in `result.json`, and the report) shows them.
- Runs: `<output dir>/<date>-<name>/`, and `<output dir>/<date>-<name>-memory-<scenario>/` for a memory test. The output dir is `--output-dir`, or `.tmp/benchmarks/runs/`. The folder has `result.json` (all samples and statistics), `report.md`, `summary.json`, and on Android `traces/` with the trace of each invalid sample (all traces with `--keep-traces`). An iOS sample has no trace. An iOS run folder also has `signed/` with the signed apps. `sample` writes its Android trace to `.tmp/benchmarks/samples/`.
- Validation: `<output dir>/<date>-known-work/`, `<output dir>/<date>-observer-cost-<scenario>/` and `<output dir>/<date>-crosscheck-<scenario>/`. The output dir is `--output-dir`, or `.tmp/benchmarks/validation/`.
- `result.json` has the format version 1. The driver writes it after each sample. Another version, or a missing or wrong field that the driver reads, is a tool error.
- `summary.json` (format version 1) has the `command`, the `status`, the `exitCode` and its `reason`, the expectations that do not hold (`failedExpectations`), the count of each verdict (`verdictCounts`), and the relative paths of `report.md` and `result.json`. The driver writes it at the end of each segment, also after a tool error (exit code 2) or an interrupt (exit code 130 or 143). An error before the run folder exists, for example an invalid config, gives no run folder.
- Exit code of `run`: 0 when all expectations hold, 1 when an expectation fails or is not decided, 2 for a tool error.

## Measurement

For each sample, the driver stops the apps, waits for a cool phone, launches the app in the scenario, waits for the READY line of the app, measures for 10 s and computes the metrics. On Android, the driver records a Perfetto trace. On iOS, the app measures itself and writes the values after the 10 s.

- The measurement revision (`measurementRevision` of the platform definition) names the rules of collection, parsing and acceptance of one platform: 2 on Android, 6 on iOS. A change of the iOS rules does not change the Android revision. The driver stores it in each result and in each noise limits record. Numbers and verdicts are valid only within one platform, one phone and one measurement revision.
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
- These are tool errors: a launch command that does not start the app, a READY line without a LAUNCH line or without `jsThread`, a display whose maximum refresh rate is not 60 Hz, an error of the sampler in the `SAMPLE` line (a failed counter read, a thread id that changed, an update without its two phases, a full buffer), a `SAMPLE` line of other threads than the LAUNCH and READY lines give, a counter that goes down, clock reads that are not in the order of the sampler (a reversed read bracket, or a read before the read that comes before it), a process CPU time less than half of the sum of the two threads after the read allowance of `threadSumExcess`, a process CPU time on the performance cores that grows more than the process CPU time by more than the counter resolution, counter reads that take more than 0.1% of the window, a UI update outside the window, UI updates that are not on a fixed cadence of the display, and a window in which each UI update is 2 or more display periods after the one before it.
- Each counter read has its own two clock reads, and the footprint read and the `Boundary` signpost too. The process CPU time and the instructions have one read each. A value uses the span between the reads of its own counter. A thread counter adds the user time and the system time, each in whole µs. A process counter is the whole µs of a value in Mach time units. So a difference of two reads is within 2 µs. The timing uncertainty of a thread value is the sum of the half widths of its two reads, plus 2 µs, over the span. The process counter can grow on all cores during its read, so its timing uncertainty uses the half widths times `cpuCount`.
- The sum check is the stored value `threadSumExcess`. The process count covers at least the time from the end of its start read to the start of its end read. A thread count can also have the time from the start of its own start read to the end of the process start read. One thread runs on one core at most, so each thread can add at most that time. `threadSumExcess` is the sum of the two threads minus the process, minus these two times and 6 µs (2 µs for each of the three counters), and 0 when the result is less than 0. The bound assumes that each counter has its current value at its read. The XNU source shows that this is not always true: the kernel adds the CPU time of a thread to its thread counter and to the process counter at the same events, a context switch and, when the kernel counts user and system time apart, a kernel entry or exit (`recount_absorb_snap` in `osfmk/kern/recount.c`). A thread that is on a core at a read is counted to its last such event. When a thread has such an event between its start read and the process start read, the process start value gets time that the thread value does not have. So a value above 0 is not a tool error. The report gives the count of the samples above 0 in its section "Diagnostics". A process value less than half of the sum of the two threads, after this allowance, is a tool error: the process and thread counters are not consistent. This 50% guard finds only gross errors. It is not an accuracy bound.
- The process counters come from one call of `task_info(TASK_POWER_INFO_V2)` in one read bracket, then one call of `task_inspect(TASK_INSPECT_BASIC_COUNTS)` for the instructions and the cycles in a second read bracket. Before the window, the app makes one full counter read that it does not use, because the first call can take more time (1.4 ms in one sample on the iPhone 14, 13 µs later). `task_inspect` sums the counters of the task for each core (`task_inspect` in `osfmk/kern/task.c`), and it fails without CPU counters in the kernel (`CONFIG_PERVASIVE_CPI`). XNU computes the user and system time and the time on the performance cores (`task_ptime`) from one read of the counters of the task for each core (`recount_task_usage_perf_only` in `osfmk/kern/recount.c`). The counters of the task keep the time of the threads that ended. The count of processor set switches (`task_pset_switches`) adds the count of each thread that ended to the task under the task lock (`thread_terminate_queue_invoke` in `osfmk/kern/thread.c`), so it also includes the threads that ended. On arm64, XNU makes one processor set for each CPU cluster (`ml_processor_register` in `osfmk/arm64/machine_routines.c`).
- The report gives the count of invalid samples for each cause and variant. A LAUNCH or READY line that comes at or after its time limit of 60 s does not count. After each launch, the driver stops the console and the app, also after a tool error.
- The verdict metric is `processInstructionRate`: an instruction-count change of the process, not a performance verdict. The CPU time of the main thread and of the JS thread, the clock rate estimate, the instructions per cycle, the performance-core share and the mount count are rows with no verdict, because the system chooses the clock rate and the core type: on the iPhone 14, the process CPU time of one scenario went down by up to 31% when the clock rate went up, with the same instruction rate (see [VALIDATION.md](VALIDATION.md#earlier-revisions)). The report gives a `better` or `worse` verdict of `processInstructionRate` with its direction ("better (fewer instructions)", "worse (more instructions)"). It marks a `processInstructionRate` row "mount count differs" when the 95% interval of the `mountBatchCount` difference of its scenario does not include 0; the row keeps its verdict, because a library change can change the mount count. No mark does not prove equal work. A verdict metric gets a verdict only when a [validation record](#validation-record) (`--validation`) validates it for the phone model, the phone, the OS build, the measurement revision and the app build identity of the run. Without such a record, the driver measures the metric, the report shows its row as `unvalidated` with no verdict, and an expectation that selects it is `not decided`. The UI update metrics have no verdict, and their name does not say that they are frame durations.

| Metric | Unit | Source | Interval | Limits | Verdict |
| --- | --- | --- | --- | --- | --- |
| `uiUpdateDurationMedian`, `uiUpdateDurationP95` | ms | The app: a passive `UIUpdateLink` (iOS 18) of the window scene. A value is the time from the entry to the phase `beforeCADisplayLinkDispatch` to the entry to the phase `afterCATransactionCommit` of the same UI update, on one monotonic clock. | UI updates that begin and end in the sample window | It does not include the event handling before the display link callbacks, a manual commit after the update, the render server, the GPU and the display. It is not the same quantity as the `hitches-updates` table of Instruments: the cross-check only compares the median and the 95th percentile with that table. No verdict. | no verdict, shown |
| `uiUpdateDurationP90`, `uiUpdateDurationP99` | ms | The same as `uiUpdateDurationMedian` | UI updates that begin and end in the sample window | The same as `uiUpdateDurationMedian`. | no, stored |
| `missedDisplayLinkCallbacks` | share of display refreshes | `Σ max(0, round(gap / P) − 1) / Σ round(gap / P)` over the gaps between the model times (`UIUpdateInfo.modelTime`) of successive UI updates. `P` is 1 / `refreshRate` of the LAUNCH line. A gap that is more than 0.25 `P` from a whole number of periods is a tool error. An epoch in which each gap is 2 `P` or more is a tool error: the app then updates at a fraction of the display rate (for example 30 Hz on a 60 Hz display), and the share does not show it. | UI updates that begin and end in the sample window | An estimate from the gaps between updates only: it does not see the refreshes before the first update and after the last update of the window. A display refresh with no UI update of the app counts as missed. The update share of a scenario does not apply to it. | no verdict, shown |
| `frameCount`, `expectedFrameCount` | count | The number of UI updates in the window; `refreshRate` of the LAUNCH line times the length of the window | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | A sample with fewer UI updates than 90% of the expected count is invalid (cause `frames`). | no, stored |
| `uiThreadCpu` | ms for each s | `1000 × Δ(user + system time)` of `thread_info(THREAD_BASIC_INFO)` of the main thread, over the seconds between the midpoints of the two reads of this counter on the monotonic clock. The app keeps a Mach handle of the thread and compares the thread id (`THREAD_IDENTIFIER_INFO`) with `mainThread` of the LAUNCH line at each read. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | Kernel-charged CPU time: it includes the interrupt time that the kernel charges to the running thread, also interrupt handling on its core that is not app work. So it is more than the `Running` time of Instruments; the cross-check compares it with `Running` plus `Interrupted` of `thread-state`. In an A/B comparison both variants are measured the same way, but equal methods do not prove equal background interrupt load: a change of interrupt time can come from library work, and the counters alone do not show the cause. Microsecond resolution. CPU time does not show the core type or the clock rate: the same work takes more time on an efficiency core and at a lower clock rate. `performanceCoreShare` and `processClockRate` show the core type and the clock rate for the whole process only. No verdict, because the system chooses the clock rate. | no verdict, shown |
| `jsThreadCpu` | ms for each s | The same for the JS thread. The app takes its Mach handle on the JS thread itself, in the synchronous TurboModule call `markReady` before READY, and the main thread reads it. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | Kernel-charged CPU time: it includes the interrupt time that the kernel charges to the running thread, also interrupt handling on its core that is not app work. So it is more than the `Running` time of Instruments; the cross-check compares it with `Running` plus `Interrupted` of `thread-state`. In an A/B comparison both variants are measured the same way, but equal methods do not prove equal background interrupt load: a change of interrupt time can come from library work, and the counters alone do not show the cause. Microsecond resolution. CPU time does not show the core type or the clock rate: the same work takes more time on an efficiency core and at a lower clock rate. `performanceCoreShare` and `processClockRate` show the core type and the clock rate for the whole process only. No verdict, because the system chooses the clock rate. | no verdict, shown |
| `otherThreadsCpu`, `processCpu` | ms for each s | The process: `total_user + total_system` of `task_info(TASK_POWER_INFO_V2)`, in whole µs. The other threads: the process minus the main thread and the JS thread. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | It includes the threads that ended in the window. The kernel adds the CPU time of a thread to its thread counter and to the process counter at the same events: a context switch, and a kernel entry or exit when the kernel counts user and system time apart. A thread that is on a core at a read is counted to its last such event. A process value that is less than half of the sum of the two threads, after the read allowance of `threadSumExcess`, is a tool error (the process and thread counters are not consistent); a smaller shortfall is `threadSumExcess`. Kernel-charged CPU time: it includes the interrupt time that the kernel charges to the running thread, also interrupt handling on its core that is not app work. So it is more than the `Running` time of Instruments; the cross-check compares it with `Running` plus `Interrupted` of `thread-state`. In an A/B comparison both variants are measured the same way, but equal methods do not prove equal background interrupt load: a change of interrupt time can come from library work, and the counters alone do not show the cause. Microsecond resolution. CPU time does not show the core type or the clock rate: the same work takes more time on an efficiency core and at a lower clock rate. `performanceCoreShare` and `processClockRate` show the core type and the clock rate for the whole process only. No verdict, because the system chooses the clock rate. | no, stored |
| `threadSumExcess` | µs | The sum of the deltas of the main thread and the JS thread, minus the delta of the process, minus the read delay and the counter resolution: the time from the start of each thread read to the end of the process start read, and 2 µs for each of the three counters. 0 when the result is less than 0. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | A value above 0 is not a tool error. It includes the threads that ended in the window. The kernel adds the CPU time of a thread to its thread counter and to the process counter at the same events: a context switch, and a kernel entry or exit when the kernel counts user and system time apart. A thread that is on a core at a read is counted to its last such event. When a thread has such an event between its start read and the process start read, the process start value gets time that the thread value does not have. The report gives the count of the samples with a value above 0 and the largest value. | no, stored |
| `performanceCoreShare` | share of process CPU time | `Δ task_ptime / Δ (total_user + total_system)` of `task_info(TASK_POWER_INFO_V2)`. `task_ptime` is the user and system time of the process on the performance cores. Each process counter read gives the two values from one read of the kernel (`recount_task_usage_perf_only`). | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | For the whole process, not for one thread: the system has no public value for each thread. It does not show the clock rate. It includes the threads that ended in the window. The kernel adds the CPU time of a thread to its thread counter and to the process counter at the same events: a context switch, and a kernel entry or exit when the kernel counts user and system time apart. A thread that is on a core at a read is counted to its last such event. A performance-core time that grows more than the process CPU time by more than the counter resolution is a tool error. `null` when the process has no CPU time in the window. No verdict. | no verdict, shown |
| `clusterSwitches` | count | `Δ task_pset_switches` of `task_info(TASK_POWER_INFO_V2)`: the times that the scheduler put a thread of the process on a core of another processor set than its last core. On arm64, XNU makes one processor set for each CPU cluster. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | It includes the threads that ended in the window. It does not show how long a thread ran on each core type. | no, stored |
| `processInstructionRate` | 10^9 instructions for each s | `Δ instructions` of `task_inspect(TASK_INSPECT_BASIC_COUNTS)` over the seconds between the midpoints of the two reads of this counter on the monotonic clock. The app reads it in its own read bracket, after the process CPU time. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | An instruction-count change, not a performance verdict. For the whole process, with no value for each thread: XNU sums the instructions and the cycles of the task counters for each core (`task_inspect` in `osfmk/kern/task.c`), so they include the threads that ended in the window, and the kernel and interrupt instructions while a thread of the process is on a core. Without CPU counters in the kernel (`CONFIG_PERVASIVE_CPI`), `task_inspect` fails, and the sampler stops with an error. It does not include the render server, the GPU, cache misses and waits. A change of the clock rate or of the core type gets no verdict: see `processClockRate` and `performanceCoreShare`. Fewer frames or fewer mounts give fewer instructions; the report marks the row "mount count differs" when the 95% interval of the `mountBatchCount` difference does not include 0, and no mark does not prove equal work. A thread that waits in a loop adds instructions. The verdict bootstrap draws single samples, not blocks. One sample of the fast mode of the iPhone 14 (a median UI update of 1.43 ms in `layout-animations`, against about 3.9 ms) had the usual instruction rate and a 1.57 times higher clock rate. Its shorter UI update is not fully explained. | with a validation record |
| `mountBatchCount` | count | Calls of `didMountComponentsWithRootTag:` of an `RCTSurfacePresenterObserver` of the app, for all surfaces. React Native calls it after each `RCTPerformMountInstructions`. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | The work check of a scenario uses it. The report shows it next to `processInstructionRate`. No verdict. | no verdict, shown |
| `processClockRate` | GHz | `Δ cycles` of `task_inspect(TASK_INSPECT_BASIC_COUNTS)` divided by `Δ (total_user + total_system)` of `task_info(TASK_POWER_INFO_V2)`: an estimate of the mean clock rate of the cores while the process ran. | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | An estimate: the cycles and the CPU time come from two kernel calls in two read brackets. For the whole process, with no value for each thread: XNU sums the instructions and the cycles of the task counters for each core (`task_inspect` in `osfmk/kern/task.c`), so they include the threads that ended in the window, and the kernel and interrupt instructions while a thread of the process is on a core. Without CPU counters in the kernel (`CONFIG_PERVASIVE_CPI`), `task_inspect` fails, and the sampler stops with an error. The mean of all core types and of all threads of the process. `null` when the process has no CPU time in the window. No verdict. | no verdict, shown |
| `processInstructionsPerCycle` | instructions for each cycle | `Δ instructions / Δ cycles` of `task_inspect(TASK_INSPECT_BASIC_COUNTS)` | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | For the whole process, with no value for each thread: XNU sums the instructions and the cycles of the task counters for each core (`task_inspect` in `osfmk/kern/task.c`), so they include the threads that ended in the window, and the kernel and interrupt instructions while a thread of the process is on a core. Without CPU counters in the kernel (`CONFIG_PERVASIVE_CPI`), `task_inspect` fails, and the sampler stops with an error. The mean of all core types and of all threads of the process. `null` when the process has no cycles in the window. No verdict. | no verdict, shown |
| `memory` | kB | `phys_footprint` of `task_info(TASK_VM_INFO)` at the end read of the window | The end of the sample window: 10 s after READY | One value for each sample. No verdict on iOS: the comparison with Activity Monitor in the cross-check is reported data only. | no verdict, shown |
| `windowMemoryDelta` | kB | `memory` minus the value at the start read of the window | Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read) | Use it to see the trend in the window only. | no, stored |
| `coldStart` | ms | `coldStart` of the LAUNCH line. The app measures it. | From the start of the process (`p_starttime` of `sysctl`) to the first display link callback | The difference of two wall-clock times. It does not include the time before the kernel starts the process. No verdict and no noise limit. | no verdict, shown |

## Sign command

`--sign-command <path>` names an executable file. A relative path starts at the folder where you run the driver. The driver keeps each iOS build without a signature (`CODE_SIGNING_ALLOWED=NO`) and signs it for each new run:

- The driver calls `<path> <app> <ipa>` with two absolute paths: the unsigned `.app` folder of the build, and the `.ipa` file to write. The working folder is `<run folder>/signed/`, and the `.ipa` is in it.
- The command must write the `.ipa` with a development signature that the iPhone accepts and with the entitlement `get-task-allow`, because `crosscheck` attaches `xctrace` to the app.
- The command must not ask for input, and it must end with exit code 0 in 15 minutes.
- The driver writes the output of the command to `<ipa>.sign.log`. A missing `.ipa` is a tool error.

## Phone storage on iOS

`run`, `sample`, `known-work` and `observer-cost` make no Instruments recording, so the Instruments service of the phone does not allocate a trace for them. On an iPhone 14 with iOS 27.2, the free space of the phone stayed between 11.53 GB and 12.38 GB over 9 hours of these commands: 10 A/A runs, 2 comparisons, 4 known-work tests and 2 observer-cost tests.

`crosscheck` records with `xctrace` (the instruments Thread Activity, Hitches, `os_signpost` and Activity Monitor). On an iPhone 14 with iOS 27 and Xcode 27.2, the Instruments service of the phone (`DTServiceHub`) writes the kernel trace of each recording to a file on the phone and keeps that space while the service runs. The space does not come back at the end of the recording, and the driver does not free it. In one test of 10 s for all processes with the instruments Thread Activity, Hitches, Thermal State and `os_signpost`, the file had 346 MB, and the free space fell by 355 MB. The cost of Activity Monitor in this file is not measured. Check the free space of the phone before each `crosscheck`.

## Verdicts

- `better`: B is lower than A.
- `worse`: B is higher than A.
- `no change found`: the data does not show a difference.

`better` and `worse` need all of these conditions:

1. The 95% bootstrap interval of the difference of the medians does not include zero.
1. The row passes the Benjamini-Hochberg procedure at 0.05 over all verdict rows of the run. The p-value comes from an exact two-sided permutation test of the rank sum (Wilcoxon rank-sum).
1. The difference is larger than the noise limit of the row.

Limits of the statistics:

- The bootstrap and the rank-sum test treat the samples as independent. The A/B/B/A blocks set the order of the samples, but the statistics do not use the blocks.
- The statistics do not prove the false-positive rate of a verdict. The evidence for it is the A/A runs of the noise limits.
- On iOS, the tool error for a process CPU time less than half of the sum of the two threads finds only gross errors. It is not an accuracy bound.

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
1. Each reading has the planned time, the measured time, the time of the command, the frame count of `dumpsys gfxinfo`, the battery level and temperature, and the total PSS, the native heap and Dalvik heap PSS, and the graphics, private other and total swap PSS in kB. A phone that has no swap PSS prints `TOTAL SWAP (KB):` in place of `TOTAL SWAP PSS:`; its total swap PSS is then `null` (`-` in the report).
1. After the last reading, the driver records one trace and checks it as `run` does.

A launch is invalid when the app process stops or changes, or `dumpsys` finds no process (`crash`), when a reading comes more than half an interval late (`late`), when the frame counter was reset (`reset`), when the app draws fewer frames per second than 25% of the refresh rate between two readings (`drawing`), or when the check of the final trace fails. After an invalid launch, the driver repeats that launch only. After 3 invalid attempts of a launch in sequence, the test fails.

For each accepted launch, `tailLevel` is the median total PSS of the readings at or after 75% of the duration, and `tailSlope` is the least-squares slope of total PSS over the readings at or after 50% of the duration, in kB per minute. The verdict of each variant is `rises` (the `tailSlope` of each launch is above `--slope-limit`, default 1000 kB per minute), `no rise found` (each is at or below the limit), `mixed`, `not decided` (fewer accepted launches than `--launches`), or `not judged (duration under 600 s)`.

The report gives the limits of the test: few launches and no confidence interval, `no rise found` does not prove that there is no leak, a rise slower than the slope limit and a late drop of memory stay hidden, and the verdict uses total PSS only. The exit code is 0 for `rises`, `no rise found` and `not judged`, 1 for `mixed` or `not decided`, and 2 for a tool error.

The device rules of `run` apply, but the test does not compare the battery level. `memory --resume <run folder> --serial <adb serial>` continues a stopped test. It keeps all valid launches and starts the launch in progress again.

## CI

The workflows run the driver on a self-hosted macOS runner with a cabled phone:

- `benchmark-run.yml` (`workflow_call`) checks its inputs, packs Reanimated and Worklets of the checkout when a side is `checkout` (`npm pack`), writes the config (`.github/workflows/helper/benchmark-config.ts`), runs the driver with `--output-dir`, uploads the output folder as an artifact, adds `report.md` to the job summary and ends with the exit code of the driver. `checkout` is the commit that the workflow checked out, and the config note has its SHA. An empty Worklets input takes the newest published version that `compatibility.json` gives for the Reanimated version. `scenarios: all` gives the scenarios that need no static flag. With `shared-element-transitions: true`, the config sets `ENABLE_SHARED_ELEMENT_TRANSITIONS` to `true` in A and B, and `all` also gives `shared-elements`. An iOS run gets `--validation` with the validation record of the runner, and the workflow stops when the record is not there. Only `without-validation-record: true` runs iOS without it, for the first A/A calibration of a phone; that run gives no verdict on `processInstructionRate`. Each run attempt has its own work folder. Two runs on one phone do not overlap: the concurrency group of the phone keeps a new run waiting and does not cancel the run in progress.
- `benchmark-manual.yml` (`workflow_dispatch`) calls it with the inputs that you give. `checkout` is the commit of the branch that you select.
- `benchmark-nightly.yml` runs each night on the default branch. It compares the latest stable release with `checkout` in two calls: the scenarios without a static flag, then `shared-elements` with `shared-element-transitions: true`.

The workflows have no secrets, signing keys or provisioning profiles, and no `pull_request` trigger. A maintainer sets up:

1. A runner with the labels `self-hosted`, `macOS` and the phone label, for example `pixel-8`. One phone label must select one runner with one cabled phone.
1. On the runner: the tools of [Tools](#tools), and Rust (`cargo`), because `npm pack` of Worklets builds its Rust plugin.
1. A GitHub environment `benchmark-<phone label>` with the variables `BENCHMARK_DEVICE_ID` (the adb serial or the UDID), `BENCHMARK_NOISE_LIMITS_DIR` (a folder on the runner) and, for an iPhone, `BENCHMARK_SIGN_COMMAND` (the absolute path of the sign command) and `BENCHMARK_VALIDATION_RECORD` (the absolute path of the validation record on the runner).
1. A deployment branch rule on that environment that permits only the default branch and the release branches (`*-stable`). The job runs repository code on a self-hosted runner.
1. For an iPhone, a sign command under the runner account, outside the repository, with the contract of [Sign command](#sign-command). The signing identity and the profiles stay on the runner.
1. The noise limits records: `<BENCHMARK_NOISE_LIMITS_DIR>/<name>.json`. Make each record with an A/A run on that phone (for example with `benchmark-manual.yml` and the same A and B), then `noise-limits` on the run folder of the artifact (see [Calibration](#calibration)). The `noise-limits` input is `<name>`: letters, digits, `.`, `_` or `-`.
1. For an iPhone, the validation record at `BENCHMARK_VALIDATION_RECORD`. Make it on the runner with the [iOS validation sequence](#ios-validation-sequence): an A/A run with `without-validation-record: true` gives the noise limits, then the known-work test and the observer-cost tests with an app of the signed `.ipa` of that run, then `validation-record`. Make it again, and replace the file, when the phone, its OS build, the app build identity (the app project files, the build tools or the build procedure of the driver) or the iOS measurement revision changes. Until then, a run with the old record gives no verdict on `processInstructionRate`: its report says that the record does not fit the run.
1. For the nightly workflow, the repository variables `BENCHMARK_NIGHTLY_ENABLED` (`true` turns it on), `BENCHMARK_NIGHTLY_PLATFORM`, `BENCHMARK_NIGHTLY_PHONE` and `BENCHMARK_NIGHTLY_NOISE_LIMITS`. They are repository variables, because the nightly workflow reads them before a job selects the environment.

## Validation of the iOS collector

Three commands measure the in-app collector of iOS on one phone: `known-work`, `observer-cost` and, as an option, `crosscheck`. Their output is not a benchmark sample. Each needs an installed app that the driver built (for example the signed `.ipa` of a run, installed with `xcrun devicectl device install app`), because the record compares the app build identity of the LAUNCH line: a hash of the app project files, the build tools and the build procedure of the driver. The versions of Reanimated and Worklets are not in it. `validation-record` reads their folders and writes the record that `run --validation` uses. Without a record that fits the run, an iOS run gives no verdict for `processInstructionRate`. No gate of the record uses a cross-check, so the sequence needs no Instruments recording.

[VALIDATION.md](VALIDATION.md) gives the method of the known-work test, the observer-cost outcomes, the checks of the record, the method of the optional cross-check and the earlier measurement revisions.

### iOS validation sequence

Make the record on the phone of the runs, with the app build identity of the runs, in this order:

1. An A/A run: a config with the same `a` and `b`, with `idle-cost` and `worklet-styles-transform` in its scenarios, because the observer-cost tests need their noise limits. A scenario that needs a static flag needs an A/A config of its own, with the flag in both.

   ```sh
   node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run \
     --config .tmp/benchmarks/configs/ios-aa.json --udid <UDID> --sign-command ./sign-benchmark.sh
   ```

1. The noise limits record of the phone:

   ```sh
   mkdir -p .tmp/benchmarks/noise-limits
   node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits \
     --runs <A/A run folder> > .tmp/benchmarks/noise-limits/iphone-14.json
   ```

1. A known-work test with the app `com.reanimatedbenchmark.a` that the A/A run installed:

   ```sh
   node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts known-work --udid <UDID> \
     --package com.reanimatedbenchmark.a
   ```

1. Two observer-cost tests with the noise limits. The allowed band of `processInstructionRate` is one quarter of its noise limit (0.5% at the floor of 2%), so give 10 to 20 blocks (the default is 10):

   ```sh
   node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts observer-cost --udid <UDID> \
     --package com.reanimatedbenchmark.a --scenario idle-cost \
     --noise-limits .tmp/benchmarks/noise-limits/iphone-14.json
   node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts observer-cost --udid <UDID> \
     --package com.reanimatedbenchmark.a --scenario worklet-styles-transform \
     --noise-limits .tmp/benchmarks/noise-limits/iphone-14.json
   ```

1. The validation record:

   ```sh
   node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts validation-record \
     --known-work <known-work folder> \
     --observer-cost <observer-cost folder> --observer-cost <observer-cost folder> \
     > .tmp/benchmarks/validation/iphone-14.json
   ```

1. A validated run:

   ```sh
   node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run \
     --config .tmp/benchmarks/configs/ios-css.json --udid <UDID> --sign-command ./sign-benchmark.sh \
     --noise-limits .tmp/benchmarks/noise-limits/iphone-14.json \
     --validation .tmp/benchmarks/validation/iphone-14.json
   ```

### Known-work test

`known-work` launches the app in the validation scenario `crosscheck-load` with a fixed plan of 13 epochs: an `idle` epoch of 4 s before and after each of the loads `known-work`, `known-work-double`, `known-work-background`, `known-work-ended`, `known-work-parallel` and `known-work-main` (6 s each). In each load epoch, the app runs units of a loop with a fixed instruction count: 1000 units on a new thread with the user-interactive QoS, 2000 units, 1000 units on a new thread with the background QoS, 1000 units on a new thread that ends after its units, 250 units on each of 4 new threads at the same time, and 1000 units on the main thread. The other new threads wait until the app has read the counters at the end of their epoch. The driver compares the instructions of each load with the count of the disassembly, and the loads with each other. [VALIDATION.md](VALIDATION.md#known-work-method) gives the method and the tolerance. The folder has `known-work.json` and `known-work.md`. The exit code is 0 when each gate passes and the thermal state stayed `Nominal`.

### Cross-check

Optional: no gate of the validation record uses it. `crosscheck` launches the app with a plan of epochs that starts on a Darwin notification, records the app with `xctrace` (the instruments Thread Activity, Hitches, `os_signpost` and Activity Monitor, for the length of the plan and 3 s), and posts the notification when `xctrace` writes that the recording started. `--epochs` gives each epoch as `<load>:<collector>:<seconds>`. The collector is `full` (counter reads, UI updates and mount count) or `endpoints` (only the counter reads). When the recording fails or the app ends, the driver stops the wait for the `SAMPLE` line and stops the app. For each epoch, the driver compares the CPU counters of the app with the `Running` plus `Interrupted` time of the trace, the mount count, the work of the load, the UI update quantiles and the memory footprint.

The scenario can be a benchmark scenario, or the validation scenario `crosscheck-load` of the app. In `crosscheck-load`, the load of each epoch is `idle`, `ui-stall` (6 ms of busy work on the UI thread on each display refresh, from a display link of the app), `js-load` (6 ms of busy work on the JS thread in each animation frame) or `render-heavy` (a new render of all views in each animation frame). The folder has `crosscheck.json` (the evidence and all values with the signed, absolute and relative errors and the timing uncertainty), `crosscheck.md` and the trace. The exit code is 0 when the counters pass and the loads ran.

### Observer cost

`observer-cost` measures the cost of the collector without Instruments: blocks of 4 samples with the full collector and with only the counter reads. For `processInstructionRate`, `uiThreadCpu`, `jsThreadCpu`, `processCpu` and `memory`, it gives the relative difference of the two modes and its 95% interval, and with `--noise-limits` an outcome for each metric. The exit code is 0 only when each verdict metric is `passed`. The folder has `observer-cost.json` and `observer-cost.md`.

### Validation record

`validation-record --known-work <folder> ... --observer-cost <folder> ... [--crosscheck <folder> ...] [--earlier-crosscheck <folder> ...]` writes a record to stdout. The record has each source in full, and for each verdict metric its gates. The driver computes the gates again from the evidence of the sources, also when it reads a record. A metric is validated only when it has gates and each gate passes:

1. Coverage: a known-work test; an observer-cost test of `idle-cost`; an observer-cost test of another benchmark scenario.
1. In each known-work test: the thermal state stayed `Nominal` (the highest of the reported state and the state of each counter read), and each gate of the test passed.
1. In each observer-cost test: it has at least 5 blocks, and the metric is `passed`.

A cross-check is an optional source: the record keeps it and checks it as before, but it enters no gate.

`run --validation <record>` uses the record when its platform, phone model, phone, OS build, measurement revision and app build identity are the values of the run. It computes the observer-cost gates again with the noise limits of the run: the band of each observer-cost test is one quarter of the limit of its scenario in the noise limits record of the run, or of the noise floor when the run has no limit for it. So a record stays valid only for noise limits that are not tighter than its observer cost allows. The run stores the record in `result.json`, and the report names the validated metrics and the reason for the others.

## Not supported

- An iOS simulator: the driver measures only on a real iPhone. On Android, use a real phone too.
- On iOS: iOS 17 or older, the `memory` command, `"profiling": true`, `--keep-traces` and `--keep-trace`, a display with a variable refresh rate or a maximum rate other than 60 Hz, a battery temperature, and the thermal state while no app runs.
- `"bundleMode": true`.
- A comparison of numbers or verdicts across platforms, phones or measurement revisions.
