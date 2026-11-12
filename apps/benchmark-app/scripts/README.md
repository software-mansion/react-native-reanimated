# Benchmark driver

The driver measures the benchmark app on an Android device. It compares two builds of the app, A and B. For each scenario and each metric, it gives one verdict. Lower values are better for all metrics.

## Commands

Run the commands from the repository root.

```sh
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --config <file.json> --serial <adb serial> [--blocks 5] [--noise-limits <file.json>] [--keep-traces]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts run --resume <run folder> --serial <adb serial>
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts noise-limits --runs <run folder> [<run folder> ...]
node --experimental-strip-types apps/benchmark-app/scripts/benchmark.mts sample --serial <adb serial> --package <application id> --scenario <name> [--load <integer>] [--keep-trace]
```

- `run` builds A and B, installs them and measures each scenario of the config. Each block measures in the order A, B, B, A (or B, A, A, B). `--blocks` sets the number of blocks for each scenario.
- `run --resume` continues a run that is not `done`. See [Stopped runs](#stopped-runs).
- `noise-limits` reads A/A runs and writes a noise limits file to stdout. See [Noise limits](#noise-limits).
- `sample` measures one scenario of an installed app one time and writes the metrics as JSON. Use it to find the load level of a scenario.

`run` and `sample` take `--trace-processor <path>`.

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
- `--noise-limits` names a JSON file `{ "<scenario>": { "<metric>": <limit> } }`. The limit has the unit of the comparison of the metric: a fraction for a relative metric, a share of frames for `jankyFrames` (0.005 is 0.5 percentage points), and kB for `memoryGrowth`. Without the file, the limit is 0.

The driver stops before it builds when the config has an unknown field, scenario or metric.

## Tools

- Node from `.nvmrc` and Yarn 4.
- The Android SDK. The driver uses `ANDROID_HOME`, or the default SDK folder when `ANDROID_HOME` is not set.
- `adb` from the SDK `platform-tools` folder or from `PATH`.
- `trace_processor_shell` from Perfetto: `--trace-processor`, then `TRACE_PROCESSOR_SHELL`, then `PATH`.
- An Android device with SDK 31 or newer and the ABI `arm64-v8a`. Do not change the brightness, the charger, the refresh rate or the network during a run. The driver reads the device state before each cool-down, and before and after each trace. The run stops when the battery level changes. The refresh rate is the render frame rate of the display. The refresh rate of the app in the first sample is the reference for the run.

## Output

- Builds: `.tmp/benchmarks/builds/<key>/`. The driver does not build a variant again when its key did not change.
- Runs: `.tmp/benchmarks/runs/<date>-<name>/` with `result.json` (all samples and statistics) and `report.md`. The driver writes `result.json` after each sample.
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
| `jsThreadCpu` | CPU time of all threads with the name `mqt_v_js`, in ms for each second | yes |
| `renderThreadCpu`, `processCpu` | CPU time of `RenderThread` and of all threads of the app, in ms for each second | no |
| `mountBatchCount` | Count of the `IntBufferBatchMountItem::mountViews` slices of the app | no |
| `memory` | Last value of anonymous RSS plus swap of the app, in kB | yes |
| `memoryGrowth` | Last value minus first value of `memory`, in kB, only in `shared-elements` and `mount-unmount` | yes |
| `coldStart` | `TotalTime` of `am start -W`, in ms | yes |
| `drawFrameMedian`, `drawFrameP95` | Duration of the `DrawFrame` slices on `RenderThread`, in ms | no |
| `frameTimelineDurationMedian`, `frameTimelineDurationP95`, `frameTimelineFrameCount` | Duration and count of the frame timeline rows of the app | no |
| `jankFlaggedFrames`, `appDeadlineMissedFrames` | Share of frame timeline rows with a jank type, and with the jank type `App Deadline Missed` | no |

The frame timeline does not give the verdict frame metrics. On some devices it marks each frame as janky at each load ("Buffer Stuffing"), and its durations change in steps of one refresh period. A trace without a `Choreographer#doFrame` slice on any thread is a tool error: the atrace category `view` gave no data. When only other processes have these slices, the app drew no frame: `frameCount` is 0, the frame duration metrics are `null`, and the sample is invalid (`frames`).

## Verdicts

- `better`: B is lower than A.
- `worse`: B is higher than A.
- `no change found`: the data does not show a difference.

`better` and `worse` need all of these conditions:

1. The 95% bootstrap interval of the difference of the medians does not include zero.
1. The row passes the Benjamini-Hochberg procedure at 0.05 over all rows of the run. The p-value comes from a two-sided permutation test of the rank sum (Wilcoxon rank-sum). The driver counts all splits of the samples, so the p-value is exact for all sample counts.
1. The difference is larger than the noise limit of the row.

`memoryGrowth` can be negative, so the driver compares it as an absolute difference in kB. `jankyFrames` is often near 0, so the driver compares it as an absolute difference in share of frames, and the report gives it in percentage points (pp). The other metrics use the relative difference. When the median of A, or the median of A in a bootstrap draw, is 0 or less, a relative difference is not defined. The row then uses the absolute difference, and the report marks it. When the median of A is above 0, the noise limit of the row is the relative limit times the median of A, in the unit of the metric. When the median of A is 0 or less, the row has no noise limit, and the report marks this too.

A sample is invalid when the app crashes before or during the trace (`crash`), when the device is hot (`thermal`), or when the app draws fewer than 90% of the expected frames (`frames`). The driver then measures the block again. After 3 invalid blocks in sequence, the scenario fails.

A device command that does not finish in its time limit is a tool error.

## Stopped runs

A run stops on a tool error or an interrupt. The driver then writes `result.json` and `report.md` with the data that it has:

- The statistics include only the complete scenarios. The Benjamini-Hochberg procedure counts each row of the other scenarios with p = 1, so the rows of the run stay the same.
- The report says that the run is not complete, names the scenarios without data, and marks the verdicts as provisional.
- An expectation that selects a scenario without data is `not decided`. A `worse` row still makes it `fails`.
- `result.json` keeps the samples of the scenario in progress in `incompleteScenario`.

`run --resume <run folder> --serial <adb serial>` continues the run in the same folder:

- It uses the config, the blocks, the noise limits and `--keep-traces` of `result.json`. The serial must be the serial of the run.
- It stops when the run is `done`, when an APK is missing or is not the same (SHA-256 in `result.json`), when the tool versions changed, or when the device state changed (the keys that the driver compares before each cool-down).
- It installs and compiles A and B again. It keeps the complete scenarios. It measures the incomplete scenario again from its first block and moves its old samples to `abandonedScenarios`. The statistics do not use them.
- The battery temperature at the start of the run stays the reference for the cool-down. The refresh rate of the app in the first sample stays the reference for the run.
- `result.json` and the report list each segment (one start of the driver) with its start, end, status and device state.

## Noise limits

`noise-limits --runs <run folder> [<run folder> ...]` reads A/A runs and writes the file that `--noise-limits` reads. A run is A/A when A and B have the same sources, installed versions, effective flags and build options. The runs do not have to be `done`. The command uses the complete scenarios. A scenario must be in one run only.

For each scenario and verdict metric:

1. Put the accepted samples of A and B in one group.
1. Divide the group in all possible ways into two groups with the sizes of A and B. Above 200000 ways, use 20000 random ways with a fixed seed.
1. For each division, compare the medians of the two groups as the verdict does (relative or absolute).
1. The limit is the 97.5th percentile of the absolute differences, but not less than the floor: 0.02 for a relative metric, 0.005 for `jankyFrames`, 4000 kB for `memoryGrowth`.

When the relative difference is not defined for a division (a median of 0 or less), the file has no limit for that metric.
