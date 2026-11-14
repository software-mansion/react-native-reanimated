import type { VariantKey } from './config.mts';
import type { InvalidCause, SampleResult } from './samples.mts';
import type { Scenario } from './scenarios.mts';

export interface SamplePlace {
  scenario: Scenario;
  variant: VariantKey;
  round: number;
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
  R & { segment: number; batteryLevel?: number };

export type Recorded<R extends Judged = SampleResult> = Measured<R> & {
  accepted: boolean;
};

export type RoundOrder = (round: number) => VariantKey[];

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

export interface ScenarioPlan<R extends Judged> {
  scenario: Scenario;
  rounds: number;
  orderOf: RoundOrder;
  sampler: Sampler<R>;
  onProgress: ProgressListener<R>;
  acceptedSamples: Recorded<R>[];
}

export const INVALID_ROUNDS_LIMIT = 3;

export async function runScenario<R extends Judged>(
  plan: ScenarioPlan<R>
): Promise<ScenarioOutcome<R>> {
  const { scenario } = plan;
  const samples: Recorded<R>[] = [...plan.acceptedSamples];
  const reportProgress = () =>
    plan.onProgress({ scenario, samples: [...samples], failed: null });
  const record = (sample: Recorded<R>) => {
    samples.push(sample);
    reportProgress();
  };
  const firstRound = new Set(plan.acceptedSamples.map((sample) => sample.round))
    .size;
  for (let round = firstRound; round < plan.rounds; round++) {
    const invalidAttempts: (SamplePlace & InvalidJudgement)[] = [];
    while (true) {
      const attempt = await runRound(
        { scenario, round, attempt: invalidAttempts.length },
        plan.orderOf(round),
        plan.sampler,
        record
      );
      const invalid = attempt.find(isInvalid);
      if (!invalid) {
        attempt.forEach((sample) => (sample.accepted = true));
        reportProgress();
        break;
      }
      invalidAttempts.push(invalid);
      if (invalidAttempts.length === INVALID_ROUNDS_LIMIT) {
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

export function balancedOrder(index: number): VariantKey[] {
  return index % 2 === 0 ? ['a', 'b', 'b', 'a'] : ['b', 'a', 'a', 'b'];
}

async function runRound<R extends Judged>(
  start: Pick<SamplePlace, 'scenario' | 'round' | 'attempt'>,
  order: VariantKey[],
  sampler: Sampler<R>,
  record: (sample: Recorded<R>) => void
): Promise<Recorded<R>[]> {
  const samples: Recorded<R>[] = [];
  for (const [position, variant] of order.entries()) {
    const measured = await sampler({ ...start, variant, position });
    const sample: Recorded<R> = Object.assign(measured, { accepted: false });
    samples.push(sample);
    record(sample);
    if (!sample.valid) {
      break;
    }
  }
  return samples;
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
