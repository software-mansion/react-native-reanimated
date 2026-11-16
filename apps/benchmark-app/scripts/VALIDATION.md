# Validation of the iOS collector: reference

This file gives the method and the checks of the validation commands of the [driver](README.md#validation-of-the-ios-collector). The commands and their order are in [the iOS validation sequence](README.md#ios-validation-sequence).

## Known-work method

The known-work test checks the instruction counter of the process (`task_inspect(TASK_INSPECT_BASIC_COUNTS)`) with a load of a known instruction count. There is no second counter as a reference: the test uses the counter that it checks.

- The unit: `benchmarkKnownWorkUnit` in `ios/ReanimatedBenchmark/KnownWorkLoad.mm`, a loop of three instructions in inline assembly (`add`, `subs`, `b.ne`) for 1,000,000 iterations. It returns the sum of the loop counter, and the thread that runs it compares this checksum with 500,000,500,000 after each unit. A wrong checksum is an error of the sampler.
- The count: from the disassembly of the app that the driver builds, not from a measurement. Get it with `otool -tV <build folder>/ios/build/Build/Products/Release-iphoneos/ReanimatedBenchmark.app/ReanimatedBenchmark` and read the function `_benchmarkKnownWorkUnit` up to its `ret`. With Xcode 27.2 and the SDK of iOS 27.2, it is:

  ```text
  mov   x0, #0x0
  mov   w8, #0x4240
  movk  w8, #0xf, lsl #16
  add   x0, x0, x8
  subs  x8, x8, #0x1
  b.ne  (to the add)
  ret
  ```

  So one unit has 3 instructions before the loop, 3 instructions in each of the 1,000,000 iterations and 1 after the loop: 3,000,004 instructions. The driver has this value as `KNOWN_WORK_INSTRUCTIONS_PER_UNIT` (`known-work.mts`). Do the check again after a change of the build tools. The call of the unit and the count of the unit in the thread are not in it (inference: some hundred instructions, less than 0.02% of a unit).
- The plan: `idle` (4 s), `known-work` (6 s), `idle`, `known-work-double`, `idle`, `known-work-background`, `idle`, `known-work-ended`, `idle`, `known-work-parallel`, `idle`, `known-work-main`, `idle`, with the collector `endpoints`. In a load epoch, the app runs the units:

  - `known-work`: 1000 units on one new thread with the user-interactive QoS.
  - `known-work-double`: 2000 units on one new thread.
  - `known-work-background`: 1000 units on one new thread with the background QoS.
  - `known-work-ended`: 1000 units on one new thread that ends after its units.
  - `known-work-parallel`: 250 units on each of 4 new threads with the user-interactive QoS that start at the same time.
  - `known-work-main`: 1000 units on the main thread, one unit in each block of the main queue.

  The other new threads wait until the app has read the counters at the end of their epoch. The app stops the count of the units before that read, so a unit that ends after it does not count.
- The instructions of a load: the instructions of its epoch minus the mean instruction rate of the `idle` epochs before and after it, times the length of the epoch (the span between the midpoints of the two instruction reads).
- The gates, each with a tolerance of 1% of the expected value:
  1. Each load epoch ran its planned units, and no epoch counted units of another load (exact).
  1. The instructions of `known-work` against 1000 times the count of a unit.
  1. `known-work-double` against `known-work`: 2.
  1. `known-work-background` against `known-work`: 1. The two threads have the same work with different QoS, so the core type and the clock rate can differ. `known-work.json` keeps the performance-core share and the clock rate of each epoch.
  1. `known-work-ended` against `known-work`: 1. This shows that the counter keeps the instructions of a thread that ended.
  1. The instructions of `known-work-parallel` against 1000 times the count of a unit. This shows that the counter adds the instructions of threads that run at the same time.
  1. The instructions of `known-work-main` against 1000 times the count of a unit. This shows that the counter has the instructions of the main thread.
- The tolerance of 1% is an acceptance target, not a measured repeatability. It is half of the noise floor of a verdict (2%). It has to cover the change of the instructions of the other threads between the `idle` epochs and the load epoch, the start and the end of the new threads, the call of each unit, the blocks of the main queue, and the kernel and interrupt instructions while the units run. One test does not show the repeatability: only repeated known-work tests on the phone show it.
- Limits: the test does not show that the counter gives the instructions of each thread of the app. It shows that the process counter has the expected count of one known loop on a new thread, on 4 threads at the same time and on the main thread, that the count is linear, that the two tested QoS settings (user-interactive and background) gave the same count, and that the counter keeps the instructions of an ended thread.

## Cross-check method

Optional since the measurement revision 6: no gate of the validation record uses a cross-check. The method was fixed for the measurement revision 4, before the validation recordings. The cross-check report states it too:

- Thread selection: the main thread is `mainThread` of the LAUNCH line, the JS thread is `jsThread` of the READY line, and the process is all threads of the app process.
- Clock mapping: the app writes a `Boundary` signpost (with its index as the id) after the counter reads at each epoch boundary, between two clock reads. The offset of a boundary is the trace time of its signpost minus the middle of its two clock reads in the app. The mapping is the median offset. A spread of the offsets of more than 1 ms is a tool error. The clock uncertainty is the largest distance of an offset from the median, plus the half width of its clock reads. `crosscheck.json` keeps, for each boundary, the id, the two app times, the trace time and the offset, all in ns (app times from the start of the first counter read of the app, trace times from the start of the trace), and all counter read brackets of the app (`appBoundaries`). The driver computes each offset and the mapping again from these times; a stored offset that does not follow, or an offset that differs from the mapping by more than its uncertainty, is a tool error.
- Reference: the `Running` time plus the `Interrupted` time of the table `thread-state` of the selected threads. The app counters give kernel-charged CPU time, which includes the interrupt time that the kernel charges to the running thread (see the [metric table](README.md#ios-1)). `crosscheck.json` and the report keep both parts.
- Clipping: each `thread-state` row is cut to the span of its counter, from the middle of its start read to the middle of its end read, moved to the clock of the trace.
- Relative error: the signed error divided by the reference.
- Failure rule: a CPU value passes when its error is within max(1 ms/s, 2% of the reference) plus its timing uncertainty, in every epoch. The timing uncertainty is the uncertainty of the counter reads and two times the clock uncertainty, over the span; for `processCpu`, the clock part is also times `cpuCount`. A failure keeps the metric unvalidated.

## Cross-check comparisons

The driver compares for each epoch:

- `uiThreadCpu`, `jsThreadCpu` and `processCpu` with the reference, by the failure rule above. The app value, the window length, the timing uncertainty and the mount count come from `appBoundaries`, `cpuCount` and the checked clock mapping. The driver also checks the order of all clock reads of `appBoundaries`.
- `mountBatchCount` with the starts of the React Native section `RCTPerformMountInstructions`: exact.
- The work of the load: in `crosscheck-load`, each load counts its work units for the current epoch. A `ui-stall`, `js-load` or `render-heavy` epoch must have its own units in at least half of the display refreshes of the epoch, and each epoch must have units of the other loads in at most 10% of them. A pass shows that each load was active in its epoch within these limits. It does not show that no other load ran: up to 10% is permitted. A `render-heavy` unit is a requested render step, not a completed mount.
- The median and the 95th percentile of the UI update durations with the rows of `hitches-updates`: within max(0.25 ms, 5%). The two quantities are not the same (see the metric table), so a pass says only that these quantiles are within the tolerance.
- `phys_footprint` at each boundary with `memory-physical-footprint` (bytes / 1024) of the table `activity-monitor-process-live`. For the footprint read of the app, moved to the trace and widened by the clock uncertainty, the driver takes the rows (sorted by start) from the last row that ends before the read to the first row that starts after it, by index. A row that only touches the outer edge of these rows is not in them. The boundary is comparable only when these rows cover at most 2 s (from the first start to the latest end) and their values differ by less than the tolerance max(1024 kB, 2%). Then the app value must be within the tolerance of the range of the rows. There is no interpolation. With fewer than 2 comparable boundaries, memory is `not available`. This check is a second reader of the same kernel counter and unit. It does not prove the accounting of the kernel.
- Assumption, not verified: Activity Monitor took the value of a row at a time between the start and the end of the row. The report of each cross-check says so. The memory comparison is reported data only: `memory` is advisory on iOS. The export of the phone recordings can show later what the time of a row means, and a later change can make `memory` a verdict metric with a gate in the code.

The thermal state of a cross-check is the highest of the state that the app reports for the sample and the state of each counter read.

`crosscheck.json` stores the evidence: the counter reads of the app (`appBoundaries`), `cpuCount`, the refresh rate, the clock mapping with its boundary times, and for each epoch the plan, the work units, the `Running` and `Interrupted` times, the trace mount count, the update counts and the app and trace quantiles, and for each boundary the Activity Monitor rows around the read. One function computes the epoch values, the footprint comparisons, the thermal state and the verdict from this evidence. The command uses it to write the result, and the reader and the validation record use it to compute each value again.

## Observer cost

`observer-cost` takes `--blocks` blocks (at least 5, default 10) of 4 samples: full collector, only the counter reads, only the counter reads, full collector. For `processInstructionRate`, `uiThreadCpu`, `jsThreadCpu`, `processCpu` and `memory` (the footprint at the end read), it gives the medians of the two modes, their relative difference and its 95% interval. The bootstrap of the interval draws whole blocks with their four samples (seed 20261114, 10000 draws). With `--noise-limits`, the driver checks the version and the load of the scenario that each launch reports against the record, and the allowed band of a metric is one quarter of its noise limit:

- `passed`: the interval is inside the band.
- `failed`: the interval is fully outside the band.
- `not validated`: the interval crosses a bound (take more blocks), the metric has no noise limit, the test has fewer than 5 blocks, or the relative difference is not defined.

The relative difference is not defined when a sample with only the counter reads has the value 0 or less. Only then are `relativeDifference` and `interval` `null`.

The band of `processInstructionRate` is 0.5% at the noise floor of 2%. Give the test 10 to 20 blocks, so that the interval can be inside the band. `run` checks the band again with the noise limits of the run, so a later A/A run with tighter limits can make the record not validate the metric.

## Validation record

`validation-record` stops when:

- the folders do not have one platform, phone model, phone, OS build, measurement revision and app build identity, the app has no app build identity, or the sources are not of the measurement revision of the driver,
- a known-work test does not have the plan of the driver, its sampled epochs are not its planned epochs, its count of a unit or its tolerance is not the value of the driver, or its stored thermal state, epochs or gates do not follow from its counter reads,
- a cross-check has no epoch, its epoch results are not its planned epochs, its tolerances are not the tolerances of the driver, its `thermalState` is below the thermal state of one of its counter reads (`appBoundaries[].thermal`), or a stored value or outcome does not follow from its evidence (a CPU value, a pass, a work proof, a footprint comparison, `verdict.counters`, `verdict.loadsRan`, `verdict.memory`),
- an observer-cost test does not have only complete blocks (at least 5), does not have each metric of each sample as a number, does not have one complete cost (medians, difference, interval, limit and outcome) for each metric, or has a cost that does not follow from its samples and its noise limit,
- two sources are one measurement: the same folder (after symbolic links), the same result (SHA-256 of its JSON), or two cross-checks with the same trace.

A cross-check is an optional source: the record keeps it and checks it, but it enters no gate.

The record has `formatVersion` (5), these values, each source in full (folder, SHA-256 and the result), the earlier cross-checks and, for each verdict metric, `validated` and its gates with their result (`passed`, `failed` or `not validated`). The gates use the outcomes that the driver computes again from the evidence, not the stored outcomes.

When the driver reads a record, it checks each source as above, and it makes the gates again from the sources. A record of another measurement revision, a record whose gates or flags are not the ones that follow from its sources, whose SHA-256 of a source is not the SHA-256 of its result, whose source is of another setup, or that has the same source twice, is a tool error. The validity of a metric comes from these gates, not from the flag.

## Earlier revisions

`--earlier-crosscheck <folder>` adds a cross-check of an earlier measurement revision to the record as history: its revision, scenario, verdict and the CPU values of each epoch. It does not enter a gate.

On the iPhone 14 (iOS 27.2), the first cross-check recording was made with the revision 3, which compared the counters with the `Running` time only. It failed the gate for `uiThreadCpu` and `processCpu` in epoch 3 (+2.03% and +2.02%; in the other epochs the errors were +1.54% to +1.60%). The revision 4 changes the reference to `Running` plus `Interrupted`. That recording is not a pass of the revision 3 method, and it is not validation evidence for the revision 4.

On the same iPhone 14 (OS build 24B115), the revision 4 passed each cross-check gate. Each observer-cost gate (10 blocks) was `not validated`, so no CPU metric was validated: in `worklet-styles-transform`, the interval of the `uiThreadCpu` cost was −5.6% to +3.3% against a band of ±0.64%. In the A/A run, some samples did the same work (the same frame count and about the same mount count) with less main thread CPU time and shorter UI updates. In `layout-animations`, 6 of 20 samples had a `uiThreadCpu` of 102 to 151 ms/s and a median UI update of 1.35 to 1.46 ms; the other samples had 216 to 247 ms/s and 3.93 to 4.04 ms. `css`, `sticky-header` and `shared-elements` had one or two such samples. The noise limit of `uiThreadCpu` in `layout-animations` was 31.8%. The revision 5 reads the process CPU time from `task_info(TASK_POWER_INFO_V2)` in place of `getrusage`, with the time on the performance cores and the count of processor set switches in the same read, and the instructions and the cycles of `task_inspect(TASK_INSPECT_BASIC_COUNTS)` in the same read bracket. It gives `performanceCoreShare`, `clusterSwitches`, `processClockRate`, `processInstructionsPerCycle` and `processInstructionRate` for each sample. It does not change the verdict rules.

On the iPhone 14, A/A runs of the revision 5 gave these results. The two fast samples of `layout-animations` in one run (100.0 and 101.3 ms/s of `uiThreadCpu`, a median UI update of 1.36 ms) had a performance-core share of 0.000; the other samples of that run had 0.002 to 0.010. In two runs with 80 samples and the cycle reading, the process CPU time and the clock rate had a Pearson r of −0.82 to −0.90 in each scenario, and the instruction rate had a coefficient of variation of 0.41% to 0.66%, against 1.26% to 4.12% for the CPU times. In a run of 80 samples of `layout-animations`, one fast sample had 159.9 ms/s and a median UI update of 1.43 ms, a clock rate of 1.228 GHz against a median of 0.783 GHz, and the usual instruction rate (0.994 times the median). The revision 6 makes `processInstructionRate` the verdict metric and the CPU times rows with no verdict, gives the instruction read its own read bracket, adds a counter read before the window, makes the sum check a stored value, and validates the instruction counter with the known-work test in place of the cross-checks.
