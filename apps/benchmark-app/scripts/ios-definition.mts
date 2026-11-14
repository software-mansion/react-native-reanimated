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
  'Microsecond resolution. CPU time does not show the core type or the clock rate: the same work takes more time on an efficiency core.';

const UPDATE_LIMIT =
  'It does not include the event handling before the display link callbacks, a manual commit after the update, the render server, the GPU and the display. It is not the same quantity as the `hitches-updates` table of Instruments. No verdict before the cross-check with Instruments passes on the phone.';

export const IOS_DEFINITION: PlatformDefinition = {
  name: 'ios',
  commands: ['run', 'sample', 'crosscheck', 'observer-cost'],
  options: { 'sign-command': 'required for run' },
  segmentColumns: [],
  deviceState: shape(DEVICE_STATE),
  inAppState: shape(IN_APP_STATE),
  verdictMetrics: ['uiThreadCpu', 'jsThreadCpu', 'memory'],
  advisoryMetrics: [
    'uiUpdateDurationMedian',
    'uiUpdateDurationP95',
    'missedDisplayLinkCallbacks',
    'coldStart',
  ],
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
        '`Σ max(0, round(gap / P) − 1) / Σ round(gap / P)` over the gaps between the model times (`UIUpdateInfo.modelTime`) of successive UI updates. `P` is 1 / `refreshRate` of the LAUNCH line. A gap that is more than 0.25 `P` from a whole number of periods is a tool error.',
      interval: UPDATES_IN_WINDOW,
      limits:
        'A display refresh with no UI update of the app counts as missed. The update share of a scenario does not apply to it.',
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
        '`1000 × Δ(user + system time)` of `thread_info(THREAD_BASIC_INFO)` of the main thread, over the elapsed seconds of the monotonic clock. The app keeps a Mach handle of the thread and compares the thread id (`THREAD_IDENTIFIER_INFO`) with `mainThread` of the LAUNCH line at each read.',
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
        'The process: user + system time of `getrusage(RUSAGE_SELF)`. The other threads: the process minus the main thread and the JS thread.',
      interval: WINDOW,
      limits: `It includes the threads that ended in the window. A process value that is less than the sum of the two threads is a tool error. ${CPU_LIMIT}`,
    },
    {
      names: ['mountBatchCount'],
      unit: 'count',
      source:
        'Calls of `didMountComponentsWithRootTag:` of an `RCTSurfacePresenterObserver` of the app, for all surfaces. React Native calls it after each `RCTPerformMountInstructions`.',
      interval: WINDOW,
      limits: 'The work check of a scenario uses it.',
    },
    {
      names: ['memory'],
      unit: 'kB',
      source:
        '`phys_footprint` of `task_info(TASK_VM_INFO)` at the end read of the window',
      interval: 'The end of the sample window: 10 s after READY',
      limits: 'One value for each sample.',
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
