# Validation of the iOS collector: reference

This file gives the method and the checks of the validation commands of the [driver](README.md#validation-of-the-ios-collector). The commands and their order are in [the iOS validation sequence](README.md#ios-validation-sequence).

## Cross-check method

The method was fixed for the measurement revision 4, before the validation recordings. The revision 5 does not change it. The cross-check report states it too:

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

`observer-cost` takes `--blocks` blocks (at least 5, default 5) of 4 samples: full collector, only the counter reads, only the counter reads, full collector. For `uiThreadCpu`, `jsThreadCpu`, `processCpu` and `memory` (the footprint at the end read), it gives the medians of the two modes, their relative difference and its 95% interval. The bootstrap of the interval draws whole blocks with their four samples (seed 20261114, 10000 draws). With `--noise-limits`, the driver checks the version and the load of the scenario that each launch reports against the record, and the allowed band of a metric is one quarter of its noise limit:

- `passed`: the interval is inside the band.
- `failed`: the interval is fully outside the band.
- `not validated`: the interval crosses a bound (take more blocks), the metric has no noise limit, the test has fewer than 5 blocks, or the relative difference is not defined.

The relative difference is not defined when a sample with only the counter reads has the value 0 or less. Only then are `relativeDifference` and `interval` `null`.

## Validation record

`validation-record` stops when:

- the folders do not have one platform, phone model, phone, OS build, measurement revision and app build identity, the app has no app build identity, or the sources are not of the measurement revision of the driver,
- a cross-check has no epoch, its epoch results are not its planned epochs, its tolerances are not the tolerances of the driver, its `thermalState` is below the thermal state of one of its counter reads (`appBoundaries[].thermal`), or a stored value or outcome does not follow from its evidence (a CPU value, a pass, a work proof, a footprint comparison, `verdict.counters`, `verdict.loadsRan`, `verdict.memory`),
- an observer-cost test does not have only complete blocks (at least 5), does not have each metric of each sample as a number, does not have one complete cost (medians, difference, interval, limit and outcome) for each metric, or has a cost that does not follow from its samples and its noise limit,
- two sources are one measurement: the same folder (after symbolic links), the same result (SHA-256 of its JSON), or two cross-checks with the same trace.

The record has `formatVersion` (4), these values, each source in full (folder, SHA-256 and the result), the earlier cross-checks and, for each verdict metric, `validated` and its gates with their result (`passed`, `failed` or `not validated`). The gates use the outcomes that the driver computes again from the evidence, not the stored outcomes.

When the driver reads a record, it checks each source as above, and it makes the gates again from the sources. A record of another measurement revision, a record whose gates or flags are not the ones that follow from its sources, whose SHA-256 of a source is not the SHA-256 of its result, whose source is of another setup, or that has the same source twice, is a tool error. The validity of a metric comes from these gates, not from the flag.

## Earlier revisions

`--earlier-crosscheck <folder>` adds a cross-check of an earlier measurement revision to the record as history: its revision, scenario, verdict and the CPU values of each epoch. It does not enter a gate.

On the iPhone 14 (iOS 27.2), the first cross-check recording was made with the revision 3, which compared the counters with the `Running` time only. It failed the gate for `uiThreadCpu` and `processCpu` in epoch 3 (+2.03% and +2.02%; in the other epochs the errors were +1.54% to +1.60%). The revision 4 changes the reference to `Running` plus `Interrupted`. That recording is not a pass of the revision 3 method, and it is not validation evidence for the revision 4.

On the same iPhone 14 (OS build 24B115), the revision 4 passed each cross-check gate. Each observer-cost gate (10 blocks) was `not validated`, so no CPU metric was validated: in `worklet-styles-transform`, the interval of the `uiThreadCpu` cost was −5.6% to +3.3% against a band of ±0.64%. In the A/A run, some samples did the same work (the same frame count and about the same mount count) with less main thread CPU time and shorter UI updates. In `layout-animations`, 6 of 20 samples had a `uiThreadCpu` of 102 to 151 ms/s and a median UI update of 1.35 to 1.46 ms; the other samples had 216 to 247 ms/s and 3.93 to 4.04 ms. `css`, `sticky-header` and `shared-elements` had one or two such samples. The noise limit of `uiThreadCpu` in `layout-animations` was 31.8%. The revision 5 reads the process CPU time from `task_info(TASK_POWER_INFO_V2)` in place of `getrusage`, with the time on the performance cores and the count of processor set switches in the same read, and gives `performanceCoreShare` and `clusterSwitches` for each sample. It does not change the verdict rules.
