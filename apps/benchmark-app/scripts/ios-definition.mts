import type { PlatformDefinition } from './platform.mts';

const WINDOW =
  'Trace window: from the first to the last `State` signpost of the app in the scheduler data of the main thread and the JS thread';

const ROWS_IN_WINDOW = 'Rows that are fully in the trace window';

const CPU_LIMIT =
  'The table has no clock rate. The same work takes more time on an efficiency core.';

export const IOS_DEFINITION: PlatformDefinition = {
  name: 'ios',
  commands: ['run', 'sample'],
  options: { 'sign-command': 'required for run' },
  segmentColumns: [],
  verdictMetrics: [
    'frameDurationMedian',
    'frameDurationP95',
    'jankyFrames',
    'uiThreadCpu',
    'jsThreadCpu',
    'memory',
  ],
  advisoryMetrics: ['coldStart'],
  frameSource: 'updates',
  metricDefinitions: [
    {
      names: ['frameDurationMedian', 'frameDurationP95'],
      unit: 'ms',
      source:
        '`xctrace`: duration of the rows of the table `hitches-updates` of the app. A row is the update phase of one frame: the work of the app on its main thread to the end of the commit.',
      interval: ROWS_IN_WINDOW,
      limits: 'The render phase and the display are not in it.',
    },
    {
      names: ['frameDurationP90', 'frameDurationP99'],
      unit: 'ms',
      source: 'The same as `frameDurationMedian`',
      interval: ROWS_IN_WINDOW,
      limits: 'The same as `frameDurationMedian`.',
    },
    {
      names: ['jankyFrames'],
      unit: 'share of frames',
      source: '`max(0, 1 - frameCount / expectedFrameCount)`',
      interval: WINDOW,
      limits:
        'Counts the expected updates that did not come. A display with a variable refresh rate is not supported.',
    },
    {
      names: ['frameCount', 'expectedFrameCount'],
      unit: 'count',
      source:
        'Count of the `hitches-updates` rows; `refreshRate` of the LAUNCH line times the length of the trace window times the update share of the scenario',
      interval: WINDOW,
      limits:
        'A frame without an update of the app has no row, so the expected count uses the update share (0.5 for `idle-cost`).',
    },
    {
      names: ['uiThreadCpu'],
      unit: 'ms for each s',
      source:
        'Time in the state `Running` of the main thread (`mainThread` of the LAUNCH line) in the table `thread-state`',
      interval: `${WINDOW}. An interval is cut to the window.`,
      limits: CPU_LIMIT,
    },
    {
      names: ['jsThreadCpu'],
      unit: 'ms for each s',
      source: 'The same for the JS thread (`jsThread` of the READY line)',
      interval: `${WINDOW}. An interval is cut to the window.`,
      limits: CPU_LIMIT,
    },
    {
      names: ['otherThreadsCpu', 'processCpu'],
      unit: 'ms for each s',
      source:
        'The same for the other threads of the app, and for all threads of the app',
      interval: `${WINDOW}. An interval is cut to the window.`,
      limits: CPU_LIMIT,
    },
    {
      names: ['uiThreadEfficiencyCoreShare'],
      unit: 'share',
      source: 'Share of `uiThreadCpu` on efficiency cores',
      interval: WINDOW,
      limits:
        '`null` when the main thread did not run, or when a `Running` interval has no known core type.',
    },
    {
      names: ['mountBatchCount'],
      unit: 'count',
      source:
        'Count of the starts of the React Native section `RCTPerformMountInstructions`',
      interval: 'Starts in the trace window',
      limits: 'The work check of a scenario uses it.',
    },
    {
      names: ['memory'],
      unit: 'kB',
      source:
        '`phys_footprint` of the app in the `State` signpost at the end of the trace window',
      interval: 'The end of the trace window',
      limits:
        'The time from the launch to this moment changes with the start time of `xctrace` (some seconds).',
    },
    {
      names: ['windowMemoryDelta'],
      unit: 'kB',
      source:
        '`memory` minus the value in the `State` signpost at the start of the trace window',
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
    {
      names: ['hitchCount', 'hitchTime'],
      unit: 'count; ms for each s',
      source:
        'Count of the rows of the table `hitches` of the app, and the sum of their durations',
      interval: 'Rows that overlap the trace window, cut to the window',
      limits: 'No verdict.',
    },
  ],
};
