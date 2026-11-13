# Benchmark driver

The driver measures the benchmark app on an Android device. It compares two builds of the app, A and B. For each scenario and each metric, it gives one verdict. Lower values are better for all metrics. The memory test (`memory`) looks for a memory leak in one scenario.

## Commands

Run the commands from the repository root.

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> --serial <adb serial> [--blocks 5] [--noise-limits <file.json>] [--keep-traces]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --resume <run folder> --serial <adb serial>
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --config <file.json> --scenario <name> --serial <adb serial> [--launches 2] [--interval 60] [--duration 1200] [--slope-limit 1000] [--keep-traces]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts memory --resume <run folder> --serial <adb serial>
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits --runs <run folder> [<run folder> ...]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts sample --serial <adb serial> --package <application id> --scenario <name> [--load <integer>] [--keep-trace]
```

- `run` builds A and B, installs them and measures each scenario of the config. Each block measures in the order A, B, B, A (or B, A, A, B). `--blocks` sets the number of blocks for each scenario.
- `run --resume` continues a run that is not `done`. See [Stopped runs](#stopped-runs).
- `memory` reads the memory of A and B in one scenario for a long time. `memory --resume` continues a memory test that is not `done`. See [Memory test](#memory-test).
- `noise-limits` reads A/A runs and writes a noise limits file to stdout. See [Noise limits](#noise-limits).
- `sample` measures one scenario of an installed app one time and writes the metrics as JSON. Use it to find the load level of a scenario.

`run`, `memory` and `sample` take `--trace-processor <path>`.

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
- `profiling: true` builds with the profiling Gradle properties. `bundleMode: true` is not supported.
- `blocks` (optional) sets the number of blocks for a scenario of the run. It replaces `--blocks` for that scenario.
- `expect` is a list of entries with `scenarios` (default: all), `metrics` (default: all), `is` (`notWorse` or `better`) and `byAtLeast` (a fraction, only with `better`). The default is `[{ "is": "notWorse" }]`.
- `--noise-limits` names a JSON file `{ "<scenario>": { "<metric>": <limit> } }`. The limit has the unit of the comparison of the metric: a fraction for a relative metric, and a share of frames for `jankyFrames` (0.005 is 0.5 percentage points). Without the file, the limit is 0. The driver ignores an entry for `memoryGrowth`, a metric of older versions.

The driver stops before it builds when the config has an unknown field, scenario or metric.

## Tools

- Node from `.nvmrc` and Yarn 4.
- The Android SDK. The driver uses `ANDROID_HOME`, or the default SDK folder when `ANDROID_HOME` is not set.
- `adb` from the SDK `platform-tools` folder or from `PATH`.
- `trace_processor_shell` from Perfetto: `--trace-processor`, then `TRACE_PROCESSOR_SHELL`, then `PATH`. The query uses the module `linux.cpu.utilization.thread` of the Perfetto standard library.
- An Android device with SDK 31 or newer and the ABI `arm64-v8a`. Do not change the brightness, the charger, the refresh rate or the network during a run. The driver reads the device state before each cool-down, and before and after each trace. The run stops when the battery level changes. The refresh rate is the render frame rate of the display. The refresh rate of the app in the first sample is the reference for the run.

## Output

- Builds: `.tmp/benchmarks/builds/<key>/`. The driver does not build a variant again when its key did not change.
- Runs: `.tmp/benchmarks/runs/<date>-<name>/` with `result.json` (all samples and statistics) and `report.md`. The driver writes `result.json` after each sample. A memory test writes to `.tmp/benchmarks/runs/<date>-<name>-memory-<scenario>/`.
- Traces: the run folder keeps the trace of each invalid sample, and all traces with `--keep-traces`. `sample` writes to `.tmp/benchmarks/samples/`.

The exit code of `run` is 0 when all expectations hold, 1 when an expectation fails or is not decided, and 2 for a tool error.

## Metrics

The driver reads each metric from the trace window of 10 s. Lower values are better.

| Metric | Definition | Verdict |
| --- | --- | --- |
| `frameDurationMedian`, `frameDurationP95` | Duration of the `Choreographer#doFrame` slices on the main thread of the app, in ms | yes |
| `frameDurationP90`, `frameDurationP99` | The same | no |
| `jankyFrames` | Share of dropped frames: `max(0, 1 - frameCount / expectedFrameCount)` | yes |
| `frameCount`, `expectedFrameCount` | Count of the `Choreographer#doFrame` slices; refresh rate times the length of the trace window | no |
| `uiThreadCpu` | CPU time of the main thread, in ms for each second of the trace | yes |
| `jsThreadCpu` | CPU time of the JS thread (`jsThread` of the READY line), in ms for each second | yes |
| `renderThreadCpu`, `otherThreadsCpu`, `processCpu` | CPU time of `RenderThread`, of all threads of the app except the main thread, the JS thread and `RenderThread`, and of all threads of the app, in ms for each second | no |
| `uiThreadCpuWork`, `processCpuWork` | Sum of the duration of each scheduling slice times the clock rate of its CPU at that time, for the main thread and for all threads of the app, in MHz·ms for each second (1 MHz·ms is 1000 CPU cycles). `null` when the trace has no clock rate data. | no |
| `mountBatchCount` | Count of the `IntBufferBatchMountItem::mountViews` slices of the app | no |
| `memory` | Last value of anonymous RSS plus swap of the app, in kB | yes |
| `windowMemoryDelta` | Last value minus first value of `memory` in the trace window, in kB | no |
| `coldStart` | `TotalTime` of `am start -W`, in ms | yes |
| `drawFrameMedian`, `drawFrameP95` | Duration of the `DrawFrame` slices on `RenderThread`, in ms | no |
| `frameTimelineDurationMedian`, `frameTimelineDurationP95`, `frameTimelineFrameCount` | Duration and count of the frame timeline rows of the app | no |
| `jankFlaggedFrames`, `appDeadlineMissedFrames` | Share of frame timeline rows with a jank type, and with the jank type `App Deadline Missed` | no |

`windowMemoryDelta` has no verdict. The trace window is in the first minutes after the launch. In that time, the memory of an app can increase and then decrease to a stable level, so the value does not show a leak. Use the [memory test](#memory-test) to find a leak.

The app gives the id of its JS thread in the READY line (`jsThread`), because other threads can have the name `mqt_v_js` too. A READY line without `jsThread` (an app from an older source) is a tool error. A trace in which the app has no thread `mqt_v_js` with this id is a tool error.

The clock rate comes from the ftrace event `power/cpu_frequency` and from `linux.sys_stats`, which reads the clock rate of each CPU at the start of the trace and then every 1000 ms. The driver uses `cpu_cycles_per_thread_in_interval` of the Perfetto standard library. CPU time before the first clock rate value of its CPU does not count. CPU time does not show a change of the clock rate: the work metrics do.

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

A sample is invalid when the app crashes before or during the trace (`crash`), when the device is hot (`thermal`), when the app draws fewer than 90% of the expected frames (`frames`), or when the app does less work than the scenario needs (`work`). Only `shared-elements` has a work limit: at least 300 `mountBatchCount`. The driver then measures the block again. After 3 invalid blocks in sequence, the scenario fails, and the report gives the cause and the detail (for `work`, the count) of each of the 3 blocks.

A device command that does not finish in its time limit is a tool error.

## Stopped runs

A run stops on a tool error or an interrupt. The driver then writes `result.json` and `report.md` with the data that it has:

- The statistics include only the complete scenarios. The Benjamini-Hochberg procedure counts each row of the other scenarios with p = 1, so the rows of the run stay the same.
- The report says that the run is not complete, names the scenarios without data, and marks the verdicts as provisional.
- An expectation that selects a scenario without data is `not decided`. A `worse` row still makes it `fails`.
- `result.json` keeps the samples of the scenario in progress in `incompleteScenario`.

`run --resume <run folder> --serial <adb serial>` continues the run in the same folder:

- It uses the config, the blocks, the noise limits and `--keep-traces` of `result.json`. The adb serial can be a new one, but the device must be the same (`ro.serialno`).
- It stops when the run is `done`, when an APK is missing or is not the same (SHA-256 in `result.json`), when the tool versions changed, or when the device state changed (the keys that the driver compares before each cool-down).
- It installs and compiles A and B again. It keeps the complete scenarios. In the incomplete scenario, it keeps the accepted blocks (4 valid samples) and continues with the first block that is not accepted. The statistics use the kept samples when the scenario is complete.
- It moves the other samples of the incomplete scenario (the block in progress and its invalid attempts) to `abandonedScenarios`. The statistics do not use them. The count of invalid blocks starts at 0 again.
- The battery temperature at the start of the run stays the reference for the cool-down. The refresh rate of the app in the first sample stays the reference for the run.
- It reads a `result.json` of format 1 (from older versions). The driver renames the metric `memoryGrowth` of each sample to `windowMemoryDelta`. It removes `memoryGrowth` from the expectations, the noise limits, the statistics and the expectation results, and it removes an expectation that has no other metric. `noise-limits` reads these files too.
- `result.json` and the report list each segment (one start of the driver) with its start, end, status and device state. Each sample in `result.json` has the number of its segment. For each scenario with blocks from more than one segment, the report gives the blocks of each segment.

## Noise limits

`noise-limits --runs <run folder> [<run folder> ...]` reads A/A runs and writes the file that `--noise-limits` reads. A run is A/A when A and B have the same sources, installed versions, effective flags and build options. The runs do not have to be `done`. The command uses the complete scenarios. A scenario must be in one run only.

For each scenario and verdict metric:

1. Put the accepted samples of A and B in one group.
1. Divide the group in all possible ways into two groups with the sizes of A and B. Above 200000 ways, use 20000 random ways with a fixed seed.
1. For each division, compare the medians of the two groups as the verdict does (relative or absolute).
1. The limit is the 97.5th percentile of the absolute differences, but not less than the floor: 0.02 for a relative metric and 0.005 for `jankyFrames`.

When the relative difference is not defined for a division (a median of 0 or less), the file has no limit for that metric.

## Memory test

`memory --config <file.json> --scenario <name> --serial <adb serial>` looks for a memory leak in one scenario. It reads and checks only `name`, `a`, `b` and `note` of the config. It ignores all other fields, so a config without `scenarios` works.

1. The driver builds and installs A and B as `run` does.
1. It launches the app in the scenario for each variant in turn: A, B, B, A, then B, A, A, B. `--launches` sets the number of launches for each variant (default 2, a multiple of 2).
1. After READY, it reads `dumpsys meminfo <application id>` every `--interval` seconds (default 60) for `--duration` seconds (default 1200). The duration must be a multiple of the interval and at least 4 intervals.
1. Each reading has the planned time, the measured time (seconds after READY when `dumpsys meminfo` returns), the time of the command in ms, the frame count (the first "Total frames rendered" of `dumpsys gfxinfo <application id>`), the battery level, and these values in kB: total PSS, the PSS of the native heap and of the Dalvik heap (rows of the table), and graphics, private other and total swap PSS (App Summary).
1. After the last reading, the driver records one trace and checks the app as `run` does (`thermal`, `frames`, `work`, `crash`).

A launch is invalid when:

- the app process stops or changes during the readings, or the app writes `FAILED` (`crash`);
- a reading comes more than half an interval after its planned time (`late`);
- the app draws fewer than 10 frames per second between two readings, or between READY and the first reading (`frames`). This is a low fixed floor. Some scenarios draw fewer frames than the refresh rate, so the driver has no sound value for each scenario;
- the check of the trace after the last reading fails.

After an invalid launch, the driver launches the block again. After 3 invalid blocks in sequence, the test fails.

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

`result.json` keeps the readings and the trace check of each launch, and the summary. `report.md` gives the verdicts, the limits, the `tailLevel` and `tailSlope` of each launch and their medians, and the series of each launch. The exit code is 0 for `rises`, `no rise found` and `not judged`, 1 when a variant is `mixed` or `not decided`, and 2 for a tool error.

The device rules of `run` apply, but the memory test does not compare the battery level, because a long test can change it. Each reading stores the battery level. The test still compares the power source, the device settings and the display, and it checks the thermal state. `memory --resume <run folder> --serial <adb serial>` continues a stopped memory test with the same rules. The driver launches the block in progress again.
