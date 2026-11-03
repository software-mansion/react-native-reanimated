import {
  createSerializable,
  createSynchronizable,
  runOnRuntimeAsync,
  runOnUIAsync,
  type Synchronizable,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

const WORKER_RUNTIME_COUNT = 3;
const PARTICIPANT_COUNT = WORKER_RUNTIME_COUNT + 2;
const ROUND_COUNT = 40;
const CACHED_ROUND_COUNT = 10;
const VALUES_PER_ROUND = 16;
const CELL_COUNT = 8;
const BARRIER_TIMEOUT_MS = 3000;
const MISSED_ROUNDS_SHOWN = 3;

type RetainedValue = {
  id: number;
  label: string;
  cells: number[];
};

type RoundReport = {
  arrivalMs: number;
  sawEveryParticipant: boolean;
  correct: number;
  cachedWithinCall: number;
  cachedAcrossCalls: number;
};

type CacheHolder = {
  __retainingConcurrencyPrevious?: RetainedValue[];
};

function makeValue(id: number): RetainedValue {
  return {
    id,
    label: `retained-${id}`,
    cells: Array.from({ length: CELL_COUNT }, (_, cell) => id * cell),
  };
}

const createRetainingSerializable = createSerializable as (
  value: RetainedValue,
  shouldPersistRemote: boolean
) => unknown;

function makeRetainedValues(round: number) {
  return Array.from({ length: VALUES_PER_ROUND }, (_, index) =>
    createRetainingSerializable(
      makeValue(round * VALUES_PER_ROUND + index),
      true
    )
  ) as unknown as RetainedValue[];
}

function isExpectedValue(value: RetainedValue, id: number) {
  'worklet';
  if (
    value === undefined ||
    value === null ||
    value.id !== id ||
    value.label !== `retained-${id}` ||
    value.cells.length !== CELL_COUNT
  ) {
    return false;
  }
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    if (value.cells[cell] !== id * cell) {
      return false;
    }
  }
  return true;
}

function unpackTogether(
  values: Synchronizable<RetainedValue[]>,
  arrived: Synchronizable<number>,
  firstId: number,
  compareWithPrevious: boolean,
  roundStart: number
): RoundReport {
  'worklet';
  arrived.setBlocking((count) => count + 1);
  const arrivalMs = Date.now() - roundStart;
  const deadline = Date.now() + BARRIER_TIMEOUT_MS;
  while (arrived.getDirty() < PARTICIPANT_COUNT && Date.now() < deadline) {
    continue;
  }
  const sawEveryParticipant = arrived.getDirty() >= PARTICIPANT_COUNT;

  const first = values.getBlocking();
  const second = values.getBlocking();
  const holder = globalThis as CacheHolder;
  const previous = holder.__retainingConcurrencyPrevious;

  let correct = 0;
  let cachedWithinCall = 0;
  let cachedAcrossCalls = 0;
  for (let index = 0; index < first.length; index++) {
    if (
      isExpectedValue(first[index], firstId + index) &&
      isExpectedValue(second[index], firstId + index)
    ) {
      correct++;
    }
    if (first[index] === second[index]) {
      cachedWithinCall++;
    }
    if (
      compareWithPrevious &&
      previous !== undefined &&
      previous[index] === first[index]
    ) {
      cachedAcrossCalls++;
    }
  }
  holder.__retainingConcurrencyPrevious = first;

  return {
    arrivalMs,
    sawEveryParticipant,
    correct,
    cachedWithinCall,
    cachedAcrossCalls,
  };
}

async function runRound(
  values: Synchronizable<RetainedValue[]>,
  firstId: number,
  compareWithPrevious: boolean
) {
  const runtimes = getWorkletRuntimesFromPool(WORKER_RUNTIME_COUNT);
  const arrived = createSynchronizable(0);
  const roundStart = Date.now();

  const workerReports = runtimes.map((runtime) =>
    runOnRuntimeAsync(
      runtime,
      unpackTogether,
      values,
      arrived,
      firstId,
      compareWithPrevious,
      roundStart
    )
  );
  const uiReport = runOnUIAsync(
    unpackTogether,
    values,
    arrived,
    firstId,
    compareWithPrevious,
    roundStart
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  const rnReport = unpackTogether(
    values,
    arrived,
    firstId,
    compareWithPrevious,
    roundStart
  );

  return [rnReport, await uiReport, ...(await Promise.all(workerReports))];
}

function participantName(index: number) {
  if (index === 0) {
    return 'RN';
  }
  if (index === 1) {
    return 'UI';
  }
  return `W${index - 2}`;
}

function describeBarrier(rounds: RoundReport[][]) {
  const reports = rounds.flat();
  const concurrent = reports.filter(
    (report) => report.sawEveryParticipant
  ).length;
  const verdict = `${concurrent}/${reports.length} saw every participant`;
  if (concurrent === reports.length) {
    return verdict;
  }

  const participants = Array.from({ length: PARTICIPANT_COUNT }, (_, index) => {
    const own = rounds.map((round) => round[index]);
    const missed = own.filter((report) => !report.sawEveryParticipant).length;
    const maxArrivalMs = Math.max(...own.map((report) => report.arrivalMs));
    return `${participantName(index)} ${missed} missed, max ${maxArrivalMs}ms`;
  });
  const missedRounds = rounds
    .map((round, index) => ({ round, index }))
    .filter(({ round }) => round.some((report) => !report.sawEveryParticipant));
  const shownRounds = missedRounds
    .slice(0, MISSED_ROUNDS_SHOWN)
    .map(
      ({ round, index }) =>
        `r${index} [${round
          .map(
            (report, participant) =>
              `${participantName(participant)} ${report.arrivalMs}${report.sawEveryParticipant ? '' : '!'}`
          )
          .join(', ')}]`
    );
  return [
    verdict,
    `per participant: ${participants.join('; ')}`,
    `${missedRounds.length}/${rounds.length} rounds missed, arrival ms (! = missed): ${shownRounds.join('; ')}`,
  ].join('\n');
}

function summarize(rounds: RoundReport[][]) {
  const reports = rounds.flat();
  return {
    reports: reports.length,
    barrier: describeBarrier(rounds),
    correct: reports.reduce((sum, report) => sum + report.correct, 0),
    cachedWithinCall: reports.reduce(
      (sum, report) => sum + report.cachedWithinCall,
      0
    ),
    cachedAcrossCalls: reports.reduce(
      (sum, report) => sum + report.cachedAcrossCalls,
      0
    ),
  };
}

describe('RetainingSerializable under concurrent unpacking', () => {
  test('gives every runtime its own cached copy of values first unpacked at the same time', async () => {
    const rounds: RoundReport[][] = [];
    for (let round = 0; round < ROUND_COUNT; round++) {
      const values = createSynchronizable(makeRetainedValues(round));
      rounds.push(await runRound(values, round * VALUES_PER_ROUND, false));
    }

    const summary = summarize(rounds);
    const reportCount = ROUND_COUNT * PARTICIPANT_COUNT;
    expect(summary.reports).toBe(reportCount);
    expect(summary.barrier).toBe(
      `${reportCount}/${reportCount} saw every participant`
    );
    expect(summary.correct).toBe(reportCount * VALUES_PER_ROUND);
    expect(summary.cachedWithinCall).toBe(reportCount * VALUES_PER_ROUND);
  });

  test('serves later concurrent unpacks on each runtime from its cache', async () => {
    const firstId = ROUND_COUNT * VALUES_PER_ROUND;
    const values = createSynchronizable(makeRetainedValues(ROUND_COUNT));
    await runRound(values, firstId, false);

    const rounds: RoundReport[][] = [];
    for (let pass = 0; pass < CACHED_ROUND_COUNT; pass++) {
      rounds.push(await runRound(values, firstId, true));
    }

    const summary = summarize(rounds);
    const reportCount = CACHED_ROUND_COUNT * PARTICIPANT_COUNT;
    expect(summary.reports).toBe(reportCount);
    expect(summary.barrier).toBe(
      `${reportCount}/${reportCount} saw every participant`
    );
    expect(summary.correct).toBe(reportCount * VALUES_PER_ROUND);
    expect(summary.cachedWithinCall).toBe(reportCount * VALUES_PER_ROUND);
    expect(summary.cachedAcrossCalls).toBe(reportCount * VALUES_PER_ROUND);
  });
});
