import type { PlatformDefinition } from './platform.mts';

const WINDOW =
  'Trace window: from the start of all data sources to the end of the recording of 10 s';

const SLICES_IN_WINDOW = 'Slices that start in the trace window';

const CPU_LIMIT = 'CPU time does not show a change of the clock rate.';

export const ANDROID_DEFINITION: PlatformDefinition = {
  name: 'android',
  commands: ['run', 'memory', 'sample'],
  options: { 'trace-processor': 'optional' },
  segmentColumns: [
    { key: 'batteryLevel', title: 'Battery level', unit: '%' },
    { key: 'batteryTemperature', title: 'Battery temperature', unit: ' °C' },
  ],
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
        'Estimated cycles of the main thread in each frame: for each complete `Choreographer#doFrame` slice, the sum of the duration of each scheduling slice of the main thread in it times the clock rate of its CPU at that time',
      interval: 'Slices that start and end in the trace window',
      limits:
        'The phone lowers the clock rate under load, so a frame can take more time with less work; these values show the work. `null` when less than 95% of the running time in the frames has a known clock rate. A scheduling slice that is open at the end of the trace does not count. No verdict.',
    },
    {
      names: ['frameCyclesCoverage'],
      unit: 'share',
      source:
        'Share of the running time of the main thread in the complete frames that has a known clock rate',
      interval: 'Slices that start and end in the trace window',
      limits: '`null` when the frames have no running time.',
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
        'Duration of each scheduling slice times the clock rate of its CPU at that time, for the main thread and for all threads of the app. The same integral as `frameCyclesMedian`, which gives the values of `cpu_cycles_per_thread_in_interval` of the Perfetto standard library.',
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
        'Last value of `mem.rss.anon` plus `mem.swap` of the app (`linux.process_stats`, each 1000 ms)',
      interval: WINDOW,
      limits: 'One value near the end of the window.',
    },
    {
      names: ['windowMemoryDelta'],
      unit: 'kB',
      source: 'Last value minus first value of `memory`',
      interval: WINDOW,
      limits:
        'The window is in the first minutes after the launch. Use the memory test to find a leak.',
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
