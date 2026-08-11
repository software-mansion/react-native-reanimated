const {
  workletHashSerializer,
  resetWorkletHashIds,
} = require('./workletHashSerializer');

expect.addSnapshotSerializer(workletHashSerializer);

beforeEach(resetWorkletHashIds);
