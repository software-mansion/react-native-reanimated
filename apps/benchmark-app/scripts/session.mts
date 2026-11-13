import type { VariantKey } from './config.mts';
import type { InvalidCause, SampleResult } from './protocol.mts';
import type { Scenario } from './scenarios.mts';

export interface SamplePlace {
  scenario: Scenario;
  variant: VariantKey;
  block: number;
  attempt: number;
  position: number;
}

export interface InvalidJudgement {
  valid: false;
  cause: InvalidCause;
  detail: string;
}

export type Judged = { valid: true } | InvalidJudgement;

export type Measured<R extends Judged = SampleResult> = SamplePlace &
  R & { segment: number; batteryLevel: number };

export type Recorded<R extends Judged = SampleResult> = Measured<R> & {
  accepted: boolean;
};

export type MeasuredSample = Measured;

export type SampleRecord = Recorded;

export type Sampler<R extends Judged> = (
  place: SamplePlace
) => Promise<Measured<R>>;

export type ProgressListener<R extends Judged> = (
  outcome: ScenarioOutcome<R>
) => void;

export interface FailedScenario {
  scenario: Scenario;
  variants: VariantKey[];
  causes: { variant: VariantKey; cause: InvalidCause; detail: string }[];
}

export interface ScenarioOutcome<R extends Judged = SampleResult> {
  scenario: Scenario;
  samples: Recorded<R>[];
  failed: FailedScenario | null;
}

export const DEFAULT_BLOCKS = 5;
export const INVALID_BLOCKS_LIMIT = 3;

export async function runScenario<R extends Judged>(
  scenario: Scenario,
  blocks: number,
  sampler: Sampler<R>,
  onProgress: ProgressListener<R> = () => {},
  acceptedSamples: Recorded<R>[] = []
): Promise<ScenarioOutcome<R>> {
  const samples: Recorded<R>[] = [...acceptedSamples];
  const reportProgress = () =>
    onProgress({ scenario, samples: [...samples], failed: null });
  const record = (sample: Recorded<R>) => {
    samples.push(sample);
    reportProgress();
  };
  const firstBlock = new Set(acceptedSamples.map((sample) => sample.block))
    .size;
  for (let block = firstBlock; block < blocks; block++) {
    const invalidAttempts: (SamplePlace & InvalidJudgement)[] = [];
    while (true) {
      const attempt = await runBlock(
        scenario,
        block,
        invalidAttempts.length,
        sampler,
        record
      );
      const invalid = attempt.find(isInvalid);
      if (!invalid) {
        attempt.forEach((sample) => (sample.accepted = true));
        reportProgress();
        break;
      }
      invalidAttempts.push(invalid);
      if (invalidAttempts.length === INVALID_BLOCKS_LIMIT) {
        return {
          scenario,
          samples,
          failed: failedScenario(scenario, invalidAttempts),
        };
      }
    }
  }
  return { scenario, samples, failed: null };
}

async function runBlock<R extends Judged>(
  scenario: Scenario,
  block: number,
  attempt: number,
  sampler: Sampler<R>,
  record: (sample: Recorded<R>) => void
): Promise<Recorded<R>[]> {
  const samples: Recorded<R>[] = [];
  for (const [position, variant] of blockOrder(block).entries()) {
    const measured = await sampler({
      scenario,
      variant,
      block,
      attempt,
      position,
    });
    const sample: Recorded<R> = Object.assign(measured, { accepted: false });
    samples.push(sample);
    record(sample);
    if (!sample.valid) {
      break;
    }
  }
  return samples;
}

export function blockOrder(block: number): VariantKey[] {
  return block % 2 === 0 ? ['a', 'b', 'b', 'a'] : ['b', 'a', 'a', 'b'];
}

function isInvalid<R extends Judged>(
  sample: Recorded<R>
): sample is Recorded<R> & InvalidJudgement {
  return !sample.valid;
}

function failedScenario(
  scenario: Scenario,
  invalidAttempts: (SamplePlace & InvalidJudgement)[]
): FailedScenario {
  return {
    scenario,
    variants: [
      ...new Set(invalidAttempts.map((sample) => sample.variant)),
    ].sort(),
    causes: invalidAttempts.map(({ variant, cause, detail }) => ({
      variant,
      cause,
      detail,
    })),
  };
}
