import fs from 'node:fs';

import type { MeasuredSample, SampleResult } from './samples.mts';
import { SCENARIO_REQUIREMENTS } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';

export interface KeptTrace {
  traceFile: string;
  keepTrace: boolean;
}

const MINIMUM_FRAME_SHARE = 0.9;

export function judgeWork(
  measured: MeasuredSample,
  scenario: Scenario
): SampleResult {
  const { metrics } = measured;
  const minimumFrames = MINIMUM_FRAME_SHARE * metrics.expectedFrameCount;
  if (metrics.frameCount < minimumFrames) {
    return {
      valid: false,
      cause: 'frames',
      detail: `${metrics.frameCount} frames, expected at least ${Math.ceil(minimumFrames)}`,
      ...measured,
    };
  }
  const { minimumMountBatches } = SCENARIO_REQUIREMENTS[scenario];
  if (metrics.mountBatchCount < minimumMountBatches) {
    return {
      valid: false,
      cause: 'work',
      detail: `${metrics.mountBatchCount} mount batches, expected at least ${minimumMountBatches}`,
      ...measured,
    };
  }
  return { valid: true, ...measured };
}

export function withTrace(
  result: SampleResult,
  trace: KeptTrace
): SampleResult {
  if (result.valid && !trace.keepTrace) {
    fs.rmSync(trace.traceFile, { recursive: true, force: true });
    return result;
  }
  return { ...result, trace: trace.traceFile };
}
