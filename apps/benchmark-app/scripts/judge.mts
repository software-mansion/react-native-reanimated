import fs from 'node:fs';

import type { MeasuredSample, SampleResult } from './protocol.mts';
import { SCENARIO_REQUIREMENTS } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';

export interface JudgedTrace {
  scenario: Scenario;
  traceFile: string;
  keepTrace: boolean;
}

export const MINIMUM_FRAME_SHARE = 0.9;

export function judgeWork(
  measured: MeasuredSample,
  trace: JudgedTrace
): SampleResult {
  const { metrics } = measured;
  const minimumFrames = MINIMUM_FRAME_SHARE * metrics.expectedFrameCount;
  if (metrics.frameCount < minimumFrames) {
    return invalid(
      measured,
      trace,
      'frames',
      `${metrics.frameCount} frames, expected at least ${Math.ceil(minimumFrames)}`
    );
  }
  const { minimumMountBatches } = SCENARIO_REQUIREMENTS[trace.scenario];
  if (metrics.mountBatchCount < minimumMountBatches) {
    return invalid(
      measured,
      trace,
      'work',
      `${metrics.mountBatchCount} mount batches, expected at least ${minimumMountBatches}`
    );
  }
  if (!trace.keepTrace) {
    fs.rmSync(trace.traceFile, { recursive: true, force: true });
    return { valid: true, ...measured };
  }
  return { valid: true, trace: trace.traceFile, ...measured };
}

function invalid(
  measured: MeasuredSample,
  trace: JudgedTrace,
  cause: 'frames' | 'work',
  detail: string
): SampleResult {
  return { valid: false, cause, detail, trace: trace.traceFile, ...measured };
}
