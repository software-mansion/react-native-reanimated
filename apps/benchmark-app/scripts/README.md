# Benchmark driver

The driver measures the benchmark app on an Android device or on an iPhone. It compares two builds of the app, A and B. For each scenario and each metric, it gives one verdict. Lower values are better for all metrics. The memory test (`memory`) looks for a memory leak in one scenario, on Android only.

## Commands

Run the commands from the repository root.

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> <device> [--blocks 5] [--noise-limits <file.json>] [--keep-traces]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --resume <run folder> <device>
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --config <file.json> --scenario <name> --serial <adb serial> [--launches 2] [--interval 60] [--duration 1200] [--slope-limit 1000] [--keep-traces]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --resume <run folder> --serial <adb serial>
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits --runs <run folder> [<run folder> ...]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts sample <device> --package <application id> --scenario <name> [--load <integer>] [--keep-trace]
```

`<device>` is `--serial <adb serial>` for Android, or `--udid <UDID>` for iOS. An iOS `run` also needs `--sign-command <path>`. See [iOS](#ios).

- `run` builds A and B, installs them and measures each scenario of the config. Each block measures in the order A, B, B, A (or B, A, A, B). `--blocks` sets the number of blocks for each scenario.
- `run --resume` continues a run that is not `done`. See [Stopped runs](#stopped-runs).
- `memory` reads the memory of A and B in one scenario for a long time. `memory --resume` continues a memory test that is not `done`. See [Memory test](#memory-test).
- `noise-limits` reads A/A runs and writes a noise limits file to stdout. See [Noise limits](#noise-limits).
- `sample` measures one scenario of an installed app one time and writes the metrics as JSON. Use it to find the load level of a scenario.

On Android, `run`, `memory` and `sample` take `--trace-processor <path>`.

## Config

```json
{
  "name": "android-sync-ui-props",
  "a": { "reanimated": "4.7.1", "worklets": "0.13.1" },
  "b": { "reanimated": "./reanimated.tgz", "worklets": "0.13.1", "reanimatedFlags": { "ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS": true } },
  "scenarios": ["worklet-styles-transform", "css"],
  "blocks": { "css": 10 },
  "expect": [{ "scenarios": ["worklet-styles-transform"], "metrics": ["uiThreadCpu"], "is": "better" }, { "is": "notWorse" }],
  "note": "optional text"
}
```

- A package source is an exact npm version or a path to a tarball from `npm pack`. A relative path starts at the folder of the config.
- `reanimatedFlags` and `workletsFlags` set static flags. Other flags keep the defaults of the installed library.
- `profiling: true` builds with the profiling Gradle properties. It is not supported on iOS. `bundleMode: true` is not supported.
- `blocks` (optional) sets the number of blocks for a scenario of the run. It replaces `--blocks` for that scenario.
- `expect` is a list of entries with `scenarios` (default: all), `metrics` (default: all), `is` (`notWorse` or `better`) and `byAtLeast` (a fraction, only with `better`). The default is `[{ "is": "notWorse" }]`.
- `--noise-limits` names a file that the `noise-limits` command wrote. See [Noise limits](#noise-limits). A run without the file is uncalibrated: the limit of each row is 0, and the report says so.

The driver stops before it builds when the config has an unknown field, scenario or metric.

## Tools

- Node from `.nvmrc` and Yarn 4.
- For iOS, see [iOS](#ios). The other items of this list are for Android.
- The Android SDK. The driver uses `ANDROID_HOME`, or the default SDK folder when `ANDROID_HOME` is not set.
- `adb` from the SDK `platform-tools` folder or from `PATH`.
- `trace_processor_shell` from Perfetto: `--trace-processor`, then `TRACE_PROCESSOR_SHELL`, then `PATH`. The query uses the module `linux.cpu.utilization.thread` of the Perfetto standard library.
- An Android device with SDK 31 or newer and the ABI `arm64-v8a`. Do not change the brightness, the charger, the refresh rate or the network during a run. The driver reads the device state before each cool-down, and before and after each trace. The run stops when the battery level changes. The refresh rate is the render frame rate of the display. The refresh rate of the app in the first sample is the reference for the run.

## Output

- Builds: `.tmp/benchmarks/builds/<key>/`. The driver does not build a variant again when its key did not change. The key has the variant (sources, tarball hashes, flags, build options), the application id suffix, the files of the app project (with `yarn.lock`), the build procedure of the driver, the Node version and the build tools: on Android the JDK (`java -version`) and the NDK and build tools revisions of `android/build.gradle`, on iOS the Xcode version and the `iphoneos` SDK version and build. The dependency versions that `yarn add` resolves in the build copy are not in the key, because the driver knows them only after the build.
- Runs: `.tmp/benchmarks/runs/<date>-<name>/` with `result.json` (all samples and statistics) and `report.md`. The driver writes `result.json` after each sample. A memory test writes to `.tmp/benchmarks/runs/<date>-<name>-memory-<scenario>/`.
- Traces: the run folder keeps the trace of each invalid sample, and all traces with `--keep-traces`. `sample` writes to `.tmp/benchmarks/samples/`.
- `result.json` has the format version 1. The driver stops with a tool error for another version, and for a `result.json` without a field that it reads.

The exit code of `run` is 0 when all expectations hold, 1 when an expectation fails or is not decided, and 2 for a tool error.

## Metrics

This section and the device rules in it are for Android. [iOS](#ios) gives the iOS definitions. The metric names are the same on the two platforms, but the definitions are not. Compare numbers and verdicts only within one platform, one phone and one measurement revision. The report of each run gives the definitions of its metrics. Lower values are better.

| Metric | Unit | Source | Interval | Limits | Verdict |
| --- | --- | --- | --- | --- | --- |
| `frameDurationMedian`, `frameDurationP95` | ms | Perfetto: duration of the `Choreographer#doFrame` slices on the main thread of the app | Slices that start in the trace window | The work of the main thread only. `RenderThread` is not in it. | yes |
| `frameDurationP90`, `frameDurationP99` | ms | The same as `frameDurationMedian` | Slices that start in the trace window | The same as `frameDurationMedian`. | no, stored |
| `frameCyclesMedian`, `frameCyclesP95` | Mcycles (10^6 CPU cycles) | Estimated cycles of the main thread in each frame: for each complete `Choreographer#doFrame` slice, the sum of the duration of each scheduling slice of the main thread in it times the clock rate of its CPU at that time | Slices that start and end in the trace window | The phone lowers the clock rate under load, so a frame can take more time with less work; these values show the work. `null` when less than 95% of the running time in the frames has a known clock rate. A scheduling slice that is open at the end of the trace does not count. No verdict. | no verdict, shown |
| `frameCyclesCoverage` | share | Share of the running time of the main thread in the complete frames that has a known clock rate | Slices that start and end in the trace window | `null` when the frames have no running time. | no, stored |
| `jankyFrames` | share of frames | `max(0, 1 - frameCount / expectedFrameCount)` | Trace window: from the start of all data sources to the end of the trace (about 10 s) | Counts the refreshes without a frame of the app. A slow frame that the app still draws does not count. | yes |
| `frameCount`, `expectedFrameCount` | count | Count of the `Choreographer#doFrame` slices on the main thread; the refresh rate of the display times the length of the trace window | Trace window: from the start of all data sources to the end of the trace (about 10 s) | Each scenario requests a frame on each refresh, also `idle-cost`. The expected count does not use the update share of the scenario. | no, stored |
| `uiThreadCpu` | ms for each s | Perfetto `sched` slices of the main thread of the app | Trace window: from the start of all data sources to the end of the trace (about 10 s). A slice is cut to the window. | CPU time does not show a change of the clock rate. | yes |
| `jsThreadCpu` | ms for each s | Perfetto `sched` slices of the JS thread (`jsThread` of the READY line) | Trace window: from the start of all data sources to the end of the trace (about 10 s). A slice is cut to the window. | CPU time does not show a change of the clock rate. | yes |
| `renderThreadCpu`, `otherThreadsCpu`, `processCpu` | ms for each s | Perfetto `sched` slices of `RenderThread`, of the other threads of the app, and of all threads of the app | Trace window: from the start of all data sources to the end of the trace (about 10 s). A slice is cut to the window. | CPU time does not show a change of the clock rate. | no, stored |
| `uiThreadCpuWork`, `processCpuWork` | MHz·ms for each s (1 MHz·ms is 1000 CPU cycles) | Duration of each scheduling slice times the clock rate of its CPU at that time, for the main thread and for all threads of the app. The same integral as `frameCyclesMedian`, which gives the values of `cpu_cycles_per_thread_in_interval` of the Perfetto standard library. | Trace window: from the start of all data sources to the end of the trace (about 10 s). A slice is cut to the window. | CPU time without a known clock rate (for example before the first clock rate value of its CPU) does not count. A scheduling slice that is open at the end of the trace does not count. `null` when no running time has a known clock rate. | no, stored |
| `mountBatchCount` | count | Count of the `IntBufferBatchMountItem::mountViews` slices of the app | Slices that start in the trace window | The work check of a scenario uses it. | no, stored |
| `memory` | kB | Last value of `mem.rss.anon` plus `mem.swap` of the app (`linux.process_stats`, each 1000 ms) | Trace window: from the start of all data sources to the end of the trace (about 10 s) | One value near the end of the window. | yes |
| `windowMemoryDelta` | kB | Last value minus first value of `memory` | Trace window: from the start of all data sources to the end of the trace (about 10 s) | The window is in the first minutes after the launch. Use the memory test to find a leak. | no, stored |
| `coldStart` | ms | `TotalTime` of `am start -W` | From the launch intent to the first frame of the activity | Ends before React Native shows content. One value for each launch. | yes |
| `drawFrameMedian`, `drawFrameP95` | ms | Duration of the `DrawFrame` slices on `RenderThread` | Slices that start in the trace window | `null` when the window has no slice. | no, stored |
| `frameTimelineDurationMedian`, `frameTimelineDurationP95`, `frameTimelineFrameCount` | ms; count | Duration and count of the frame timeline rows of the app | Rows that start in the trace window | On some phones each frame has the jank type "Buffer Stuffing", and the durations change in steps of one refresh period. | no, stored |
| `jankFlaggedFrames`, `appDeadlineMissedFrames` | share of frames | Share of the frame timeline rows with a jank type, and with the jank type `App Deadline Missed` | Rows that start in the trace window | `null` when the window has no row. | no, stored |

`windowMemoryDelta` has no verdict. The trace window is in the first minutes after the launch. In that time, the memory of an app can increase and then decrease to a stable level, so the value does not show a leak. Use the [memory test](#memory-test) to find a leak.

The app gives the id of its JS thread in the READY line (`jsThread`), because other threads can have the name `mqt_v_js` too. A READY line without `jsThread` (an app from an older source) is a tool error. A trace in which the app has no thread `mqt_v_js` with this id is a tool error.

The clock rate comes from the ftrace event `power/cpu_frequency` and from `linux.sys_stats`, which reads the clock rate of each CPU at the start of the trace and then every 1000 ms.

The frame timeline does not give the verdict frame metrics. On some devices it marks each frame as janky at each load ("Buffer Stuffing"), and its durations change in steps of one refresh period. A trace without a `Choreographer#doFrame` slice on any thread is a tool error: the atrace category `view` gave no data. When only other processes have these slices, the app drew no frame: `frameCount` is 0, the frame duration metrics are `null`, and the sample is invalid (`frames`).

## Verdicts

- `better`: B is lower than A.
- `worse`: B is higher than A.
- `no change found`: the data does not show a difference.

`better` and `worse` need all of these conditions:

1. The 95% bootstrap interval of the difference of the medians does not include zero.
1. The row passes the Benjamini-Hochberg procedure at 0.05 over all rows of the run. The p-value comes from a two-sided permutation test of the rank sum (Wilcoxon rank-sum). The driver counts all splits of the samples, so the p-value is exact for all sample counts.
1. The difference is larger than the noise limit of the row.

`jankyFrames` is often near 0, so the driver compares it as an absolute difference in share of frames, and the report gives it in percentage points (pp). The other metrics use the relative difference. When the median of A, or the median of A in a bootstrap draw, is 0 or less, a relative difference is not defined. The row then uses the absolute difference, and the report marks it. When the median of A is above 0, the noise limit of the row is the relative limit times the median of A, in the unit of the metric. When the median of A is 0 or less, the row has no noise limit, and the report marks this too.

A sample is invalid when the app crashes before or during the trace (`crash`), when the device is hot (`thermal`), when the app draws fewer than 90% of the expected frames (`frames`), or when the app does less work than the scenario needs (`work`). The driver then measures the block again.

Each scenario declares its requirements in `scenarios.mts`:

- The update share: the share of the display refreshes in which the app updates its views. It is 1 for all scenarios except `idle-cost` (0.5, an update on each second frame). On iOS, `expectedFrameCount` uses it, because a frame without an update has no row. On Android, `Choreographer#doFrame` runs on each refresh in all scenarios, so the share does not apply.
- The work check: the minimum `mountBatchCount` in one recording of 10 s. Only `shared-elements` has one: 300. Basis: in the first runs, a working sample had 574 to 628 (Samsung Galaxy A16) and 588 to 710 (iPhone 13 mini), and a sample with stopped transitions had 38. The limit is about half of a working count. After 3 invalid blocks in sequence, the scenario fails, and the report gives the cause and the detail (for `work`, the count) of each of the 3 blocks.

A device command that does not finish in its time limit is a tool error.

## Stopped runs

A run stops on a tool error or an interrupt. The driver then writes `result.json` and `report.md` with the data that it has:

- The statistics include only the complete scenarios. The Benjamini-Hochberg procedure counts each row of the other scenarios with p = 1, so the rows of the run stay the same.
- The report says that the run is not complete, names the scenarios without data, and marks the verdicts as provisional.
- An expectation that selects a scenario without data is `not decided`. A `worse` row still makes it `fails`.
- `result.json` keeps the samples of the scenario in progress in `incompleteScenario`.

`run --resume <run folder> --serial <adb serial>` continues the run in the same folder:

- It uses the config, the blocks, the noise limits and `--keep-traces` of `result.json`. The adb serial can be a new one, but the device must be the same (`ro.serialno`).
- It stops when the run is `done`, when an install file (the APK, or the signed `.ipa`) is missing or is not the same (SHA-256 in `result.json`), when the tool versions changed, or when the device state changed (the keys that the driver compares before each cool-down).
- It installs A and B again (and compiles them on Android). It keeps the complete scenarios. In the incomplete scenario, it keeps the accepted blocks (4 valid samples) and continues with the first block that is not accepted. The statistics use the kept samples when the scenario is complete.
- It moves the other samples of the incomplete scenario (the block in progress and its invalid attempts) to `abandonedScenarios`. The statistics do not use them. The count of invalid blocks starts at 0 again.
- The battery temperature at the start of the run stays the reference for the cool-down. The refresh rate of the app in the first sample stays the reference for the run.
- It stops when the measurement revision of the run is not the revision of the driver.
- `result.json` and the report list each segment (one start of the driver) with its start, end, status and device state. Each sample in `result.json` has the number of its segment. For each scenario with blocks from more than one segment, the report gives the blocks of each segment.

## Noise limits

`noise-limits --runs <run folder> [<run folder> ...]` reads A/A runs and writes the file that `--noise-limits` reads: `{ "formatVersion": 1, "platform", "measurementRevision", "limits": { "<scenario>": { "<metric>": <limit> } } }`. The limit has the unit of the comparison of the metric: a fraction for a relative metric, and a share of frames for `jankyFrames` (0.005 is 0.5 percentage points). The file also has the device (`model`, `deviceId`, `osBuild`) and the source runs with the accepted samples of A and B for each scenario. The runs must have the same platform, device and measurement revision. `run` stops when the file has another platform, another device model or another measurement revision. A run is A/A when A and B have the same sources, installed versions, effective flags and build options. The runs do not have to be `done`. The command uses the complete scenarios. A scenario must be in one run only.

For each scenario and verdict metric of the platform:

1. Put the accepted samples of A and B in one group.
1. Divide the group in all possible ways into two groups with the sizes of A and B. Above 200000 ways, use 20000 random ways with a fixed seed.
1. For each division, compare the medians of the two groups as the verdict does (relative or absolute).
1. The limit is the 97.5th percentile of the absolute differences, but not less than the floor: 0.02 for a relative metric and 0.005 for `jankyFrames`.

When the relative difference is not defined for a division (a median of 0 or less), the file has no limit for that metric.

## Memory test

The memory test is for Android only.

`memory --config <file.json> --scenario <name> --serial <adb serial>` looks for a memory leak in one scenario. It reads and checks only `name`, `a`, `b` and `note` of the config. It ignores all other fields, so a config without `scenarios` works.

1. The driver builds and installs A and B as `run` does.
1. It launches the app in the scenario for each variant in turn: A, B, B, A, then B, A, A, B. `--launches` sets the number of launches for each variant (default 2).
1. After READY, it reads `dumpsys meminfo <application id>` every `--interval` seconds (default 60) for `--duration` seconds (default 1200). The duration must be a multiple of the interval and at least 4 intervals.
1. Each reading has the planned time, the measured time (seconds from the start of the readings, which is a short time after READY, to the moment when `dumpsys meminfo` returns), the time of the command in ms, the frame count with its own measured time (when `dumpsys gfxinfo <application id>` returns), the battery level, the battery temperature, and these values in kB: total PSS, the PSS of the native heap and of the Dalvik heap (rows of the table), and graphics, private other and total swap PSS (App Summary).
1. After the last reading, the driver records one trace and checks the app as `run` does (`thermal`, `frames`, `work`, `crash`).

A launch is invalid when:

- the app process stops or changes during the readings, the app writes `FAILED`, `dumpsys meminfo` or `dumpsys gfxinfo` finds no process, or the pid of `dumpsys gfxinfo` is not the pid of the launch (`crash`);
- a reading comes more than half an interval after its planned time (`late`);
- the frame counter of `dumpsys gfxinfo` was reset: its `Stats since` value changed, or its count is lower than at the reading before (`reset`);
- the drawing check fails: between two frame counts, the app draws fewer frames per second than 25% of the display refresh rate of the device state (15 at 60 Hz) (`drawing`). The driver reads the first frame count after READY;
- the check of the trace after the last reading fails.

The frame count proves that the app drew during each interval. It does not prove that the scenario made progress during each interval. The trace after the last reading proves the work of the scenario for the last 10 s only.

Each launch is a unit of its own. The driver accepts each valid launch. After an invalid launch, it repeats that launch only. After 3 invalid attempts of a launch in sequence, the test fails.

For each accepted launch, the driver uses the measured time:

- `tailLevel`: the median total PSS of the readings at or after 75% of the duration, in kB.
- `tailSlope`: the least-squares slope of total PSS over the readings at or after 50% of the duration, in kB per minute.

The verdict of each variant:

- `rises`: the `tailSlope` of each launch is above `--slope-limit` (default 1000 kB per minute).
- `no rise found`: the `tailSlope` of each launch is at or below the limit.
- `mixed`: the launches do not agree.
- `not decided`: the variant has fewer accepted launches than `--launches`.
- `not judged (duration under 600 s)`: a verdict needs a duration of at least 600 s. The report still gives the series, the levels and the slopes.

Limits of the test:

- It uses few launches for each variant and gives no confidence interval.
- `no rise found` does not prove that there is no leak.
- The test does not find a rise that is slower than the slope limit.
- A late drop of memory can hide a rise.
- The second half of the duration can still contain start-up effects.
- The verdict uses total PSS only. A rise in another value, for example in swap PSS, does not change it.
- The same number of launches for each variant does not give the same conditions. A repeated launch or a resumed test changes the order, and the launches of one variant can start on a cooler device. The report gives the segment, the launch number and the attempt of each launch.

`result.json` keeps the readings and the trace check of each launch, and the summary. `report.md` gives the verdicts, the limits, the `tailLevel` and `tailSlope` of each launch and their medians, and the series of each launch. The exit code is 0 for `rises`, `no rise found` and `not judged`, 1 when a variant is `mixed` or `not decided`, and 2 for a tool error.

The device rules of `run` apply, but the memory test does not compare the battery level, because a long test can change it. Each reading stores the battery level. The test still compares the power source, the device settings and the display, and it checks the thermal state. `memory --resume <run folder> --serial <adb serial>` continues a stopped memory test with the same rules. It keeps all valid launches and starts the launch in progress again. The cool-down rule of `run` applies before each launch. Each reading stores the battery temperature, so the data shows a long launch that makes the device warm.

## iOS

The iOS path measures on a real iPhone. A simulator is not supported, because its numbers are not the numbers of a phone.

### Tools and device

- Phone storage: the Instruments service of the phone keeps about 0.3 GB of trace data for each `xctrace` recording until the service ends. The driver cannot delete it. A restart of the phone is the only known way to free it. Plan a free storage of 0.3 GB times the number of samples. Each run and each resume segment installs the apps first, and a failed install is a tool error that names this cause.

- Xcode with `xctrace` and `devicectl` (tested with Xcode 27.2), Ruby and Bundler for CocoaPods.

- An iPhone with Developer Mode on, paired with the Mac and unlocked. `xcrun devicectl list devices` gives the UDID.

- A sign command: `--sign-command <path>` names an executable file. A relative path starts at the folder where you run the driver. The driver builds and keeps the app without a signature (`CODE_SIGNING_ALLOWED=NO`). For each new run, it calls `<path> <the .app> <the .ipa to write>` for each variant, with the run folder as the working folder. The command must write an `.ipa` that the iPhone accepts and that has the entitlement `get-task-allow` (a development signature), because `xctrace` attaches to the app. It must not ask for input. The `.ipa` goes to `<run folder>/signed/`, and its log to `<variant>.ipa.sign.log` next to it.

- `"profiling": true` and the `memory` command are not supported.

After each install, the driver launches the app one time and stops it, because the first launch after an install is slow.

### Sample

1. The driver stops A and B and waits 10 s.
1. `devicectl device process launch --console` starts the app with the scenario as launch argument and gives the stdout of the app to the driver.
1. The `LAUNCH` line of the app gives the thermal state. No host tool reads the thermal state or the battery of an iPhone while no app runs. When the state is above `Nominal`, the driver stops the app, waits 30 s and launches it again. After 10 minutes without a `Nominal` state, the run stops with a tool error.
1. The driver waits for the `READY` line.
1. `xctrace record` attaches to the app for 10 s with the template `Animation Hitches`, the instrument `os_signpost`, and the signposts of React Native (`dev.reactnative.instruments`) and of the app (`com.reanimatedbenchmark`).
1. The driver stops the app, exports tables of the trace with `xctrace export` and computes the metrics.

The app writes a `State` signpost each second. The trace window is the time from the first to the last `State` signpost in the scheduler data of the measured threads: the longest time in which the table `thread-state` gives a known state of the main thread and of the JS thread with no gap. A row that starts at 0 gives the state before the scheduler data starts, so it does not count. The window must be at least 80% of the recording (8 s). Each sample stores the window (`traceWindow`: start, end and length).

### Metrics

| Metric | Unit | Source | Interval | Limits | Verdict |
| --- | --- | --- | --- | --- | --- |
| `frameDurationMedian`, `frameDurationP95` | ms | `xctrace`: duration of the rows of the table `hitches-updates` of the app. A row is the update phase of one frame: the work of the app on its main thread to the end of the commit. | Rows that are fully in the trace window | The render phase and the display are not in it. | yes |
| `frameDurationP90`, `frameDurationP99` | ms | The same as `frameDurationMedian` | Rows that are fully in the trace window | The same as `frameDurationMedian`. | no, stored |
| `jankyFrames` | share of frames | `max(0, 1 - frameCount / expectedFrameCount)` | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the trace | Counts the expected updates that did not come. A display with a variable refresh rate is not supported. | yes |
| `frameCount`, `expectedFrameCount` | count | Count of the `hitches-updates` rows; `refreshRate` of the LAUNCH line times the length of the trace window times the update share of the scenario | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the trace | A frame without an update of the app has no row, so the expected count uses the update share (0.5 for `idle-cost`). | no, stored |
| `uiThreadCpu` | ms for each s | Time in the state `Running` of the main thread (`mainThread` of the LAUNCH line) in the table `thread-state` | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the trace. An interval is cut to the window. | The table has no clock rate. The same work takes more time on an efficiency core. | yes |
| `jsThreadCpu` | ms for each s | The same for the JS thread (`jsThread` of the READY line) | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the trace. An interval is cut to the window. | The table has no clock rate. The same work takes more time on an efficiency core. | yes |
| `otherThreadsCpu`, `processCpu` | ms for each s | The same for the other threads of the app, and for all threads of the app | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the trace. An interval is cut to the window. | The table has no clock rate. The same work takes more time on an efficiency core. | no, stored |
| `uiThreadEfficiencyCoreShare` | share | Share of `uiThreadCpu` on efficiency cores | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the trace | `null` when the main thread did not run, or when a `Running` interval has no known core type. | no, stored |
| `mountBatchCount` | count | Count of the starts of the React Native section `RCTPerformMountInstructions` | Starts in the trace window | The work check of a scenario uses it. | no, stored |
| `memory` | kB | `phys_footprint` of the app in the `State` signpost at the end of the trace window | The end of the trace window | The time from the launch to this moment changes with the start time of `xctrace` (some seconds). | yes |
| `windowMemoryDelta` | kB | `memory` minus the value in the `State` signpost at the start of the trace window | Trace window: from the first to the last `State` signpost of the app in the scheduler data of the trace | Use it to see the trend in the window only. | no, stored |
| `coldStart` | ms | `coldStart` of the LAUNCH line. The app measures it. | From the start of the process (`p_starttime` of `sysctl`) to the first display link callback | The difference of two wall-clock times. It does not include the time before the kernel starts the process. No verdict and no noise limit. | no verdict, shown |
| `hitchCount`, `hitchTime` | count; ms for each s | Count of the rows of the table `hitches` of the app, and the sum of their durations | Rows that overlap the trace window, cut to the window | No verdict. | no, stored |

The table `thread-state` has each scheduling interval of each thread, so the CPU time is the time on a core, not an estimate from samples. Only the state `Running` is CPU time. The driver knows the states of the Instruments schema (`engineering_types.etypesdef` of Xcode): `Running`, `Runnable`, `Preempted`, `Throttled`, `Interrupted`, `Blocked`, `Idle`, `Terminated` and `Unknown`. Another state, a row without a thread id, a duration of 0 or less, or a missing column is a tool error. `Unknown` is not scheduler data. The table does not show the clock rate. The scheduler moves the main thread between efficiency cores and performance cores, and the same work needs more time on an efficiency core. `uiThreadEfficiencyCoreShare` shows this for each sample.

The trace has the cost of the Time Profiler samples (the `Animation Hitches` template includes them), of the React Native signposts and of the `State` signposts. A and B have the same tools, but the cost is not measured, and a variant that runs more React Native sections has more signpost cost.

### Invalid samples, device state and stopped runs

- `crash`: the app writes `FAILED`, the console command ends before `READY` or during the trace, or the main thread ends in the trace.
- `thermal`: the trace shows a thermal state above `Nominal` (the table `device-thermal-state-intervals` in the trace window, or a `State` signpost of the trace).
- `frames` and `work`: as on Android.
- Before each sample, the driver reads the UDID, the product type and the OS build with `devicectl`. A change stops the run.
- Each `State` signpost of a trace gives the battery level, the battery state, the low power mode and the brightness, and the `LAUNCH` line gives the refresh rate. The first sample of the run gives the reference (`inAppState` in `result.json`). A later difference stops the run.
- These are tool errors: a launch command that fails before the app starts, a `READY` line without `LAUNCH` or without `jsThread`, a display whose maximum refresh rate is not 60 Hz, a trace without the main thread or the JS thread, a trace window shorter than 8 s, and a command that does not finish in its time limit. A `LAUNCH` or `READY` line that comes at or after its time limit (60 s) does not count. After each launch, the driver stops the console and the app, also after a tool error.
- `run --resume <run folder> --udid <UDID>` continues a stopped run with the same rules as on Android. It does not build or sign: it installs the signed `.ipa` files of the run folder when their SHA-256 did not change, so it does not take `--sign-command`. A run cannot continue on the other platform.

### Limits

- No battery temperature. The thermal state has 4 steps only.
- `coldStart` comes from the app, not from an operating system tool, so it has no verdict on iOS: the report shows it with its difference and interval, it has no noise limit, and an expectation cannot select it.
- `memory` is the value at the end of the trace. The time from the launch to this moment changes with the start time of `xctrace` (some seconds).
- The scenario loads were set on a slow Android phone. On an iPhone they use a smaller part of the frame budget.
- Only a display with a fixed rate of 60 Hz is supported. On a display with a variable refresh rate, the maximum rate is not the rate of the frames, so `jankyFrames` is not sound there.
