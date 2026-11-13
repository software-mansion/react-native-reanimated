import type { VariantKey } from './config.mts';
import type { InvalidCause, InvalidSample, SampleResult } from './protocol.mts';
import type { Scenario } from './scenarios.mts';

export interface SamplePlace {
  scenario: Scenario;
  variant: VariantKey;
  block: number;
  attempt: number;
  position: number;
}

export type MeasuredSample = SamplePlace &
  SampleResult & { segment: number; batteryLevel: number };

export type SampleRecord = MeasuredSample & { accepted: boolean };

export type Sampler = (place: SamplePlace) => Promise<MeasuredSample>;

export type ProgressListener = (outcome: ScenarioOutcome) => void;

export interface FailedScenario {
  scenario: Scenario;
  variants: VariantKey[];
  causes: { variant: VariantKey; cause: InvalidCause; detail: string }[];
}

export interface ScenarioOutcome {
  scenario: Scenario;
  samples: SampleRecord[];
  failed: FailedScenario | null;
}

export const DEFAULT_BLOCKS = 5;
export const INVALID_BLOCKS_LIMIT = 3;

export async function runScenario(
  scenario: Scenario,
  blocks: number,
  sampler: Sampler,
  onProgress: ProgressListener = () => {},
  acceptedSamples: SampleRecord[] = []
): Promise<ScenarioOutcome> {
  const samples: SampleRecord[] = [...acceptedSamples];
  const reportProgress = () =>
    onProgress({ scenario, samples: [...samples], failed: null });
  const record = (sample: SampleRecord) => {
    samples.push(sample);
    reportProgress();
  };
  const firstBlock = new Set(acceptedSamples.map((sample) => sample.block))
    .size;
  for (let block = firstBlock; block < blocks; block++) {
    const invalidAttempts: (SamplePlace & InvalidSample)[] = [];
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

async function runBlock(
  scenario: Scenario,
  block: number,
  attempt: number,
  sampler: Sampler,
  record: (sample: SampleRecord) => void
): Promise<SampleRecord[]> {
  const samples: SampleRecord[] = [];
  for (const [position, variant] of blockOrder(block).entries()) {
    const sample = {
      ...(await sampler({ scenario, variant, block, attempt, position })),
      accepted: false,
    };
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

function isInvalid(
  sample: SampleRecord
): sample is SampleRecord & InvalidSample {
  return !sample.valid;
}

function failedScenario(
  scenario: Scenario,
  invalidAttempts: (SamplePlace & InvalidSample)[]
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
