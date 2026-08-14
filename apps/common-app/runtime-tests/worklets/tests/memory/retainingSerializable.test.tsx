import { runOnRuntimeAsync } from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

const RUNTIME_COUNT = 5;
const SERIALIZABLE_COUNT = 1000;
const PAYLOAD_ROW_COUNT = 24;
const PAYLOAD_COLUMN_COUNT = 16;

type PayloadRow = {
  id: string;
  label: string;
  cells: number[];
};

type Batch = (() => number)[];

function makePayload(seed: number): PayloadRow[] {
  return Array.from({ length: PAYLOAD_ROW_COUNT }, (_, row) => ({
    id: `payload-${seed}-${row}`,
    label: `label-${seed}-${row}`.padEnd(32, '.'),
    cells: Array.from(
      { length: PAYLOAD_COLUMN_COUNT },
      (_unused, column) => seed * PAYLOAD_ROW_COUNT + row * column
    ),
  }));
}

function makeBatch(): Batch {
  return Array.from({ length: SERIALIZABLE_COUNT }, (_, index) => {
    const payload = makePayload(index);

    return () => {
      'worklet';
      let checksum = 0;
      for (const row of payload) {
        checksum += row.cells.length + row.label.length;
      }
      return checksum;
    };
  });
}

function consumeBatch(batch: Batch) {
  'worklet';
  let checksum = 0;
  for (const worklet of batch) {
    checksum += worklet();
  }
  return checksum;
}

describe('RetainingSerializable cache', () => {
  const runtimes = getWorkletRuntimesFromPool(RUNTIME_COUNT);

  const batch = makeBatch();
  const expectedChecksum =
    SERIALIZABLE_COUNT * (PAYLOAD_ROW_COUNT * (PAYLOAD_COLUMN_COUNT + 32));

  test('unpacks one batch of retained worklets into every runtime at once', async () => {
    const checksums = await Promise.all(
      runtimes.map((runtime) => runOnRuntimeAsync(runtime, consumeBatch, batch))
    );

    for (const checksum of checksums) {
      expect(checksum).toBe(expectedChecksum);
    }
  });

  test('serves the same batch from the per-runtime cache on later passes', async () => {
    for (let pass = 0; pass < RUNTIME_COUNT; pass++) {
      const checksums = await Promise.all(
        runtimes.map((runtime) =>
          runOnRuntimeAsync(runtime, consumeBatch, batch)
        )
      );

      for (const checksum of checksums) {
        expect(checksum).toBe(expectedChecksum);
      }
    }
  });
});
