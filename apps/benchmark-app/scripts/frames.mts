import { SCENARIO_REQUIREMENTS } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import { quantile } from './statistics.mts';

export type FrameSource = 'refreshes' | 'updates';

export interface FrameBasis {
  refreshRate: number;
  share: number;
}

export interface FrameMetrics {
  frameDurationMedian: number | null;
  frameDurationP90: number | null;
  frameDurationP95: number | null;
  frameDurationP99: number | null;
  jankyFrames: number;
  frameCount: number;
  expectedFrameCount: number;
}

export function expectedFrameShare(
  source: FrameSource,
  scenario: Scenario
): number {
  return source === 'updates' ? SCENARIO_REQUIREMENTS[scenario].updateShare : 1;
}

export function frameMetrics(
  durationsMs: readonly number[],
  basis: FrameBasis,
  windowSeconds: number
): FrameMetrics {
  const expectedFrameCount = basis.refreshRate * windowSeconds * basis.share;
  return {
    frameDurationMedian: quantileOrNull(durationsMs, 0.5),
    frameDurationP90: quantileOrNull(durationsMs, 0.9),
    frameDurationP95: quantileOrNull(durationsMs, 0.95),
    frameDurationP99: quantileOrNull(durationsMs, 0.99),
    jankyFrames: Math.max(0, 1 - durationsMs.length / expectedFrameCount),
    frameCount: durationsMs.length,
    expectedFrameCount,
  };
}

export function quantileOrNull(
  values: readonly number[],
  q: number
): number | null {
  return values.length > 0 ? quantile(values, q) : null;
}
