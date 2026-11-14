import type { DeviceState } from './android-device.mts';
import type { PlatformDefinition } from './platform.mts';
import { aBoolean, aNumber, absent, aString, shape } from './validation.mts';
import type { Check } from './validation.mts';

const WINDOW =
  'Trace window: from the start of all data sources to the end of the recording of 10 s';

const SLICES_IN_WINDOW = 'Slices that start in the trace window';

const CPU_LIMIT = 'CPU time does not show a change of the clock rate.';

const DEVICE_STATE: Record<keyof DeviceState, Check> = {
  deviceId: aString,
  model: aString,
  fingerprint: aString,
  sdk: aNumber,
  abi: aString,
  refreshRate: aNumber,
  brightness: aNumber,
  brightnessMode: aString,
  batteryLevel: aNumber,
  batteryStatus: aString,
  chargeState: aString,
  wifiEnabled: aBoolean,
  wifiConnected: aBoolean,
  thermalStatus: aNumber,
  batteryTemperature: aNumber,
};

export const ANDROID_DEFINITION: PlatformDefinition = {
  name: 'android',
  commands: ['run', 'memory', 'sample'],
  options: {
    'trace-processor': 'optional',
    'keep-traces': 'optional',
    'keep-trace': 'optional',
  },
  segmentColumns: [
    { key: 'batteryLevel', title: 'Battery level', unit: '%' },
    { key: 'batteryTemperature', title: 'Battery temperature', unit: ' °C' },
  ],
  deviceState: shape(DEVICE_STATE),
  inAppState: absent,
  verdictMetrics: [
    'frameDurationMedian',
    'frameDurationP95',
    'jankyFrames',
    'uiThreadCpu',
    'jsThreadCpu',
    'memory',
    'coldStart',
  ],
  advisoryMetrics: ['frameCyclesMedian', 'frameCyclesP95'],
  verdictsNeedValidation: false,
  frameSource: 'refreshes',
  metricDefinitions: [
    {
      names: ['frameDurationMedian', 'frameDurationP95'],
      unit: 'ms',
      source:
        'Perfetto: duration of the `Choreographer#doFrame` slices on the main thread of the app',
      interval: SLICES_IN_WINDOW,
      limits: 'The work of the main thread only. `RenderThread` is not in it.',
    },
    {
      names: ['frameDurationP90', 'frameDurationP99'],
      unit: 'ms',
      source: 'The same as `frameDurationMedian`',
      interval: SLICES_IN_WINDOW,
      limits: 'The same as `frameDurationMedian`.',
    },
    {
      names: ['frameCyclesMedian', 'frameCyclesP95'],
      unit: 'Mcycles (10^6 CPU cycles)',
      source:
        'An estimate of the CPU cycles that the scheduler gave to the main thread inside each complete `Choreographer#doFrame` slice: the running time of the main thread on each core multiplied by the recorded clock rate of that core (`power/cpu_frequency`). The median and the 95th percentile over the frames that count.',
      interval:
        'Slices that start and end in the trace window. A scheduling slice that is open at the end of the trace ends at the end of the trace.',
      limits:
        'There is no instruction counter. Blocked time, work outside the frame slice, other threads, rendering and the GPU are not in it. Cycles on different core types are not equal work. Missing clock rate data makes the value lower. The CPU clock rate can fall, so a frame can take more time with fewer cycles. A frame counts when 95% or more of its running time has a known clock rate. `null` when fewer than 95% of the complete frames count.',
    },
    {
      names: ['frameCyclesCoverage'],
      unit: 'share',
      source:
        'Share of the complete `Choreographer#doFrame` slices that count for `frameCyclesMedian`',
      interval: 'Slices that start and end in the trace window',
      limits: '`null` when the trace window has no complete frame.',
    },
    {
      names: ['jankyFrames'],
      unit: 'share of frames',
      source: '`max(0, 1 - frameCount / expectedFrameCount)`',
      interval: WINDOW,
      limits:
        'Counts the refreshes without a frame of the app. A slow frame that the app still draws does not count.',
    },
    {
      names: ['frameCount', 'expectedFrameCount'],
      unit: 'count',
      source:
        'Count of the `Choreographer#doFrame` slices on the main thread; the refresh rate of the display times the length of the trace window',
      interval: WINDOW,
      limits:
        'Each scenario requests a frame on each refresh, also `idle-cost`. The expected count does not use the update share of the scenario.',
    },
    {
      names: ['uiThreadCpu'],
      unit: 'ms for each s',
      source: 'Perfetto `sched` slices of the main thread of the app',
      interval: `${WINDOW}. A slice is cut to the window.`,
      limits: CPU_LIMIT,
    },
    {
      names: ['jsThreadCpu'],
      unit: 'ms for each s',
      source:
        'Perfetto `sched` slices of the JS thread (`jsThread` of the READY line)',
      interval: `${WINDOW}. A slice is cut to the window.`,
      limits: CPU_LIMIT,
    },
    {
      names: ['renderThreadCpu', 'otherThreadsCpu', 'processCpu'],
      unit: 'ms for each s',
      source:
        'Perfetto `sched` slices of `RenderThread`, of the other threads of the app, and of all threads of the app',
      interval: `${WINDOW}. A slice is cut to the window.`,
      limits: CPU_LIMIT,
    },
    {
      names: ['uiThreadCpuWork', 'processCpuWork'],
      unit: 'MHz·ms for each s (1 MHz·ms is 1000 CPU cycles)',
      source:
        'Duration of each scheduling slice times the clock rate of its CPU at that time, for the main thread and for all threads of the app. It gives the values of `cpu_cycles_per_thread_in_interval` of the Perfetto standard library.',
      interval: `${WINDOW}. A slice is cut to the window.`,
      limits:
        'CPU time without a known clock rate (for example before the first clock rate value of its CPU) does not count. A scheduling slice that is open at the end of the trace does not count. `null` when no running time has a known clock rate.',
    },
    {
      names: ['mountBatchCount'],
      unit: 'count',
      source:
        'Count of the `IntBufferBatchMountItem::mountViews` slices of the app',
      interval: SLICES_IN_WINDOW,
      limits: 'The work check of a scenario uses it.',
    },
    {
      names: ['memory'],
      unit: 'kB',
      source:
        'The last value of `mem.rss.anon` plus the last value of `mem.swap` of the app process (`linux.process_stats`, each 1000 ms). Swap is 0 when the trace has no `mem.swap` value.',
      interval: 'The full trace. The counters are not cut to the trace window.',
      limits: 'One value near the end of the trace.',
    },
    {
      names: ['windowMemoryDelta'],
      unit: 'kB',
      source:
        '`memory` minus the sum of the first value of `mem.rss.anon` and the first value of `mem.swap`',
      interval: 'The full trace. The counters are not cut to the trace window.',
      limits:
        'The trace is in the first minutes after the launch. Use the memory test to find a leak.',
    },
    {
      names: ['coldStart'],
      unit: 'ms',
      source: '`TotalTime` of `am start -W`',
      interval: 'From the launch intent to the first frame of the activity',
      limits:
        'Ends before React Native shows content. One value for each launch.',
    },
    {
      names: ['drawFrameMedian', 'drawFrameP95'],
      unit: 'ms',
      source: 'Duration of the `DrawFrame` slices on `RenderThread`',
      interval: SLICES_IN_WINDOW,
      limits: '`null` when the window has no slice.',
    },
    {
      names: [
        'frameTimelineDurationMedian',
        'frameTimelineDurationP95',
        'frameTimelineFrameCount',
      ],
      unit: 'ms; count',
      source: 'Duration and count of the frame timeline rows of the app',
      interval: 'Rows that start in the trace window',
      limits:
        'On some phones each frame has the jank type "Buffer Stuffing", and the durations change in steps of one refresh period.',
    },
    {
      names: ['jankFlaggedFrames', 'appDeadlineMissedFrames'],
      unit: 'share of frames',
      source:
        'Share of the frame timeline rows with a jank type, and with the jank type `App Deadline Missed`',
      interval: 'Rows that start in the trace window',
      limits: '`null` when the window has no row.',
    },
  ],
};
