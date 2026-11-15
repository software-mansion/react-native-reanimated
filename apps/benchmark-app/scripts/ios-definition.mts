import type { AppState } from './in-app-sample.mts';
import type { IosDeviceState } from './ios-device.mts';
import type { PlatformDefinition } from './platform.mts';
import { aBoolean, aNumber, aString, shape } from './validation.mts';
import type { Check } from './validation.mts';

const WINDOW =
  'Sample window: from the counter read of the app at READY to its read 10 s later (the midpoint of each read)';

const UPDATES_IN_WINDOW = 'UI updates that begin and end in the sample window';

const DEVICE_STATE: Record<keyof IosDeviceState, Check> = {
  deviceId: aString,
  name: aString,
  model: aString,
  productType: aString,
  osVersion: aString,
  osBuild: aString,
};

const IN_APP_STATE: Record<keyof AppState | 'refreshRate', Check> = {
  refreshRate: aNumber,
  batteryLevel: aNumber,
  batteryState: aString,
  lowPowerMode: aBoolean,
  brightness: aNumber,
};

const CPU_LIMIT =
  'Kernel-charged CPU time: it includes the interrupt time that the kernel charges to the running thread, also interrupt handling on its core that is not app work. So it is more than the `Running` time of Instruments; the cross-check compares it with `Running` plus `Interrupted` of `thread-state`. In an A/B comparison both variants are measured the same way, but equal methods do not prove equal background interrupt load: a change of interrupt time can come from library work, and the counters alone do not show the cause. Microsecond resolution. CPU time does not show the core type or the clock rate: the same work takes more time on an efficiency core and at a lower clock rate. `performanceCoreShare` and `processClockRate` show the core type and the clock rate for the whole process only. No verdict, because the system chooses the clock rate.';

const PROCESS_COUNTER_LIMIT =
  'It includes the threads that ended in the window. The kernel adds the CPU time of a thread to its thread counter and to the process counter at the same events: a context switch, and a kernel entry or exit when the kernel counts user and system time apart. A thread that is on a core at a read is counted to its last such event.';

const INSTRUCTION_COUNT_LIMIT =
  'For the whole process, with no value for each thread: XNU sums the instructions and the cycles of the task counters for each core (`task_inspect` in `osfmk/kern/task.c`), so they include the threads that ended in the window, and the kernel and interrupt instructions while a thread of the process is on a core. Without CPU counters in the kernel (`CONFIG_PERVASIVE_CPI`), `task_inspect` fails, and the sampler stops with an error.';

const UPDATE_LIMIT =
  'It does not include the event handling before the display link callbacks, a manual commit after the update, the render server, the GPU and the display. It is not the same quantity as the `hitches-updates` table of Instruments: the cross-check only compares the median and the 95th percentile with that table. No verdict.';

export const IOS_DEFINITION: PlatformDefinition = {
  name: 'ios',
  commands: ['run', 'sample', 'crosscheck', 'observer-cost', 'known-work'],
  options: { 'sign-command': 'required for run', validation: 'optional' },
  segmentColumns: [],
  deviceState: shape(DEVICE_STATE),
  inAppState: shape(IN_APP_STATE),
  verdictMetrics: ['processInstructionRate'],
  advisoryMetrics: [
    'uiUpdateDurationMedian',
    'uiUpdateDurationP95',
    'missedDisplayLinkCallbacks',
    'mountBatchCount',
    'uiThreadCpu',
    'jsThreadCpu',
    'processClockRate',
    'processInstructionsPerCycle',
    'performanceCoreShare',
    'memory',
    'coldStart',
  ],
  verdictsNeedValidation: true,
  equalWork: { metric: 'mountBatchCount', marks: ['processInstructionRate'] },
  diagnostics: [{ metric: 'threadSumExcess', unit: 'µs' }],
  measurementRevision: 6,
  frameSource: 'refreshes',
  metricDefinitions: [
    {
      names: ['uiUpdateDurationMedian', 'uiUpdateDurationP95'],
      unit: 'ms',
      source:
        'The app: a passive `UIUpdateLink` (iOS 18) of the window scene. A value is the time from the entry to the phase `beforeCADisplayLinkDispatch` to the entry to the phase `afterCATransactionCommit` of the same UI update, on one monotonic clock.',
      interval: UPDATES_IN_WINDOW,
      limits: UPDATE_LIMIT,
    },
    {
      names: ['uiUpdateDurationP90', 'uiUpdateDurationP99'],
      unit: 'ms',
      source: 'The same as `uiUpdateDurationMedian`',
      interval: UPDATES_IN_WINDOW,
      limits: 'The same as `uiUpdateDurationMedian`.',
    },
    {
      names: ['missedDisplayLinkCallbacks'],
      unit: 'share of display refreshes',
      source:
        '`Σ max(0, round(gap / P) − 1) / Σ round(gap / P)` over the gaps between the model times (`UIUpdateInfo.modelTime`) of successive UI updates. `P` is 1 / `refreshRate` of the LAUNCH line. A gap that is more than 0.25 `P` from a whole number of periods is a tool error. An epoch in which each gap is 2 `P` or more is a tool error: the app then updates at a fraction of the display rate (for example 30 Hz on a 60 Hz display), and the share does not show it.',
      interval: UPDATES_IN_WINDOW,
      limits:
        'An estimate from the gaps between updates only: it does not see the refreshes before the first update and after the last update of the window. A display refresh with no UI update of the app counts as missed. The update share of a scenario does not apply to it.',
    },
    {
      names: ['frameCount', 'expectedFrameCount'],
      unit: 'count',
      source:
        'The number of UI updates in the window; `refreshRate` of the LAUNCH line times the length of the window',
      interval: WINDOW,
      limits:
        'A sample with fewer UI updates than 90% of the expected count is invalid (cause `frames`).',
    },
    {
      names: ['uiThreadCpu'],
      unit: 'ms for each s',
      source:
        '`1000 × Δ(user + system time)` of `thread_info(THREAD_BASIC_INFO)` of the main thread, over the seconds between the midpoints of the two reads of this counter on the monotonic clock. The app keeps a Mach handle of the thread and compares the thread id (`THREAD_IDENTIFIER_INFO`) with `mainThread` of the LAUNCH line at each read.',
      interval: WINDOW,
      limits: CPU_LIMIT,
    },
    {
      names: ['jsThreadCpu'],
      unit: 'ms for each s',
      source:
        'The same for the JS thread. The app takes its Mach handle on the JS thread itself, in the synchronous TurboModule call `markReady` before READY, and the main thread reads it.',
      interval: WINDOW,
      limits: CPU_LIMIT,
    },
    {
      names: ['otherThreadsCpu', 'processCpu'],
      unit: 'ms for each s',
      source:
        'The process: `total_user + total_system` of `task_info(TASK_POWER_INFO_V2)`, in whole µs. The other threads: the process minus the main thread and the JS thread.',
      interval: WINDOW,
      limits: `${PROCESS_COUNTER_LIMIT} A process value that is less than half of the sum of the two threads is a tool error (a wrong unit or a wrong thread); a smaller shortfall is \`threadSumExcess\`. ${CPU_LIMIT}`,
    },
    {
      names: ['threadSumExcess'],
      unit: 'µs',
      source:
        'The sum of the deltas of the main thread and the JS thread, minus the delta of the process, minus the read delay and the counter resolution: the time from the start of each thread read to the end of the process start read, and 2 µs for each of the three counters. 0 when the result is less than 0.',
      interval: WINDOW,
      limits: `A value above 0 is not a tool error. ${PROCESS_COUNTER_LIMIT} When a thread has such an event between its start read and the process start read, the process start value gets time that the thread value does not have. The report gives the count of the samples with a value above 0 and the largest value.`,
    },
    {
      names: ['performanceCoreShare'],
      unit: 'share of process CPU time',
      source:
        '`Δ task_ptime / Δ (total_user + total_system)` of `task_info(TASK_POWER_INFO_V2)`. `task_ptime` is the user and system time of the process on the performance cores. Each process counter read gives the two values from one read of the kernel (`recount_task_usage_perf_only`).',
      interval: WINDOW,
      limits: `For the whole process, not for one thread: the system has no public value for each thread. It does not show the clock rate. ${PROCESS_COUNTER_LIMIT} A performance-core time that grows more than the process CPU time by more than the counter resolution is a tool error. \`null\` when the process has no CPU time in the window. No verdict.`,
    },
    {
      names: ['clusterSwitches'],
      unit: 'count',
      source:
        '`Δ task_pset_switches` of `task_info(TASK_POWER_INFO_V2)`: the times that the scheduler put a thread of the process on a core of another processor set than its last core. On arm64, XNU makes one processor set for each CPU cluster.',
      interval: WINDOW,
      limits:
        'It includes the threads that ended in the window. It does not show how long a thread ran on each core type.',
    },
    {
      names: ['processInstructionRate'],
      unit: '10^9 instructions for each s',
      source:
        '`Δ instructions` of `task_inspect(TASK_INSPECT_BASIC_COUNTS)` over the seconds between the midpoints of the two reads of this counter on the monotonic clock. The app reads it in its own read bracket, after the process CPU time.',
      interval: WINDOW,
      limits: `An instruction-count change, not a performance verdict. ${INSTRUCTION_COUNT_LIMIT} It does not include the render server, the GPU, cache misses and waits. A change of the clock rate or of the core type gets no verdict: see \`processClockRate\` and \`performanceCoreShare\`. Fewer frames or fewer mounts give fewer instructions; the report marks the row "work differs" when the 95% interval of the \`mountBatchCount\` difference does not include 0. A thread that waits in a loop adds instructions. The verdict bootstrap draws single samples, not blocks. One sample of the fast mode of the iPhone 14 (a median UI update of 1.43 ms in \`layout-animations\`, against about 3.9 ms) had the usual instruction rate and a 1.57 times higher clock rate. Its shorter UI update is not fully explained.`,
    },
    {
      names: ['mountBatchCount'],
      unit: 'count',
      source:
        'Calls of `didMountComponentsWithRootTag:` of an `RCTSurfacePresenterObserver` of the app, for all surfaces. React Native calls it after each `RCTPerformMountInstructions`.',
      interval: WINDOW,
      limits:
        'The work check of a scenario uses it. The report shows it next to `processInstructionRate`. No verdict.',
    },
    {
      names: ['processClockRate'],
      unit: 'GHz',
      source:
        '`Δ cycles` of `task_inspect(TASK_INSPECT_BASIC_COUNTS)` divided by `Δ (total_user + total_system)` of `task_info(TASK_POWER_INFO_V2)`: an estimate of the mean clock rate of the cores while the process ran.',
      interval: WINDOW,
      limits: `An estimate: the cycles and the CPU time come from two kernel calls in two read brackets. ${INSTRUCTION_COUNT_LIMIT} The mean of all core types and of all threads of the process. \`null\` when the process has no CPU time in the window. No verdict.`,
    },
    {
      names: ['processInstructionsPerCycle'],
      unit: 'instructions for each cycle',
      source:
        '`Δ instructions / Δ cycles` of `task_inspect(TASK_INSPECT_BASIC_COUNTS)`',
      interval: WINDOW,
      limits: `${INSTRUCTION_COUNT_LIMIT} The mean of all core types and of all threads of the process. \`null\` when the process has no cycles in the window. No verdict.`,
    },
    {
      names: ['memory'],
      unit: 'kB',
      source:
        '`phys_footprint` of `task_info(TASK_VM_INFO)` at the end read of the window',
      interval: 'The end of the sample window: 10 s after READY',
      limits:
        'One value for each sample. No verdict on iOS: the comparison with Activity Monitor in the cross-check is reported data only.',
    },
    {
      names: ['windowMemoryDelta'],
      unit: 'kB',
      source: '`memory` minus the value at the start read of the window',
      interval: WINDOW,
      limits: 'Use it to see the trend in the window only.',
    },
    {
      names: ['coldStart'],
      unit: 'ms',
      source: '`coldStart` of the LAUNCH line. The app measures it.',
      interval:
        'From the start of the process (`p_starttime` of `sysctl`) to the first display link callback',
      limits:
        'The difference of two wall-clock times. It does not include the time before the kernel starts the process. No verdict and no noise limit.',
    },
  ],
};
