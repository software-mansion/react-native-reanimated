import type { ScenarioReport } from './app-report.mts';
import type { Clock } from './clock.mts';
import type { SampleMetrics } from './metrics.mts';
import type { InAppState } from './platform.mts';

export type InvalidCause =
  | 'crash'
  | 'thermal'
  | 'frames'
  | 'work'
  | 'late'
  | 'reset'
  | 'drawing';

export type SampleStep = (typeof SAMPLE_STEPS)[number];

export interface TraceWindow {
  startNs: number;
  endNs: number;
  seconds: number;
}

export interface SampleObservations {
  report?: ScenarioReport;
  pid?: number;
  refreshRate?: number;
  thermalBefore?: number;
  thermalAfter?: number;
  inAppState?: InAppState;
  traceWindow?: TraceWindow;
  metrics?: SampleMetrics;
  timings: Partial<Record<SampleStep, number>>;
  trace?: string;
}

export type ValidSample = SampleObservations & {
  valid: true;
  report: ScenarioReport;
  metrics: SampleMetrics;
};

export type InvalidSample = SampleObservations & {
  valid: false;
  cause: InvalidCause;
  detail: string;
};

export type SampleResult = ValidSample | InvalidSample;

export type MeasuredSample = SampleObservations & {
  report: ScenarioReport;
  metrics: SampleMetrics;
  thermalAfter: number;
};

export interface SampleSteps {
  timings: SampleResult['timings'];
  timed: <T>(step: SampleStep, action: () => Promise<T>) => Promise<T>;
}

export const SAMPLE_INVALID_CAUSES: readonly InvalidCause[] = [
  'crash',
  'thermal',
  'frames',
  'work',
];

export const SAMPLE_STEPS = [
  'wait',
  'start',
  'ready',
  'trace',
  'pull',
  'parse',
] as const;

export const MINIMUM_WAIT_MS = 10_000;

export const COOL_DOWN_LIMIT_MS = 600_000;

export const READY_TIMEOUT_MS = 60_000;

export const PROCESS_POLL_MS = 1_000;

export function timedSteps(clock: Clock): SampleSteps {
  const timings: SampleSteps['timings'] = {};
  return {
    timings,
    timed: async (step, action) => {
      const startedAt = clock.now();
      try {
        return await action();
      } finally {
        timings[step] = clock.now() - startedAt;
      }
    },
  };
}
