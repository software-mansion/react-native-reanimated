import { createSerializable } from '../src/memory/serializable';
import { runOnUIAsync, scheduleOnUI } from '../src/threads.native';
import { WorkletsModule } from '../src/WorkletsModule/NativeWorklets.native';

jest.mock('../src/debug/bundleMode', () => ({
  isBundleModeEnabled: () => false,
}));

jest.mock('../src/featureFlags/featureFlags', () => ({
  getStaticFeatureFlag: () => false,
}));

jest.mock('../src/guardImplementation', () => ({
  addNoBundleModeGuardImplementation: () => {},
}));

jest.mock('../src/memory/serializable', () => ({
  createSerializable: jest.fn((value: unknown) => ({ value })),
  makeShareableCloneOnUIRecursive: jest.fn(),
}));

jest.mock('../src/workletFunction', () => ({
  isWorkletFunction: () => true,
}));

jest.mock('../src/WorkletsModule/NativeWorklets.native', () => ({
  WorkletsModule: {
    createSerializableArray: jest.fn((value: unknown) => ({ value })),
    scheduleOnUI: jest.fn(),
  },
}));

describe('native threads implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('serializes scheduled worklets directly and passes their arguments separately', async () => {
    const firstWorklet = jest.fn();
    const secondWorklet = jest.fn();
    const firstArguments = [1, { value: 'first' }];
    const secondArguments = ['second'];

    scheduleOnUI(firstWorklet, ...firstArguments);
    scheduleOnUI(secondWorklet, ...secondArguments);
    jest.mocked(createSerializable).mockClear();

    await Promise.resolve();

    expect(createSerializable).toHaveBeenCalledTimes(4);
    expect(createSerializable).toHaveBeenNthCalledWith(1, firstWorklet);
    expect(createSerializable).toHaveBeenNthCalledWith(2, firstArguments);
    expect(createSerializable).toHaveBeenNthCalledWith(3, secondWorklet);
    expect(createSerializable).toHaveBeenNthCalledWith(4, secondArguments);
    expect(WorkletsModule.scheduleOnUI).toHaveBeenCalledWith(
      {
        value: [{ value: firstWorklet }, { value: secondWorklet }],
      },
      {
        value: [{ value: firstArguments }, { value: secondArguments }],
      },
      undefined
    );
  });

  test('keeps result-handling wrappers and reuses their empty arguments', async () => {
    const firstWorklet = jest.fn();
    const secondWorklet = jest.fn();

    void runOnUIAsync(firstWorklet, 'first argument');
    void runOnUIAsync(secondWorklet, 'second argument');
    jest.mocked(createSerializable).mockClear();

    await Promise.resolve();

    expect(createSerializable).toHaveBeenCalledTimes(3);
    const firstResultHandlingWorklet = jest.mocked(createSerializable).mock
      .calls[0][0];
    const secondResultHandlingWorklet = jest.mocked(createSerializable).mock
      .calls[2][0];
    expect(firstResultHandlingWorklet).not.toBe(firstWorklet);
    expect(firstResultHandlingWorklet).toEqual(expect.any(Function));
    expect(createSerializable).toHaveBeenNthCalledWith(2, []);
    expect(WorkletsModule.scheduleOnUI).toHaveBeenCalledWith(
      {
        value: [
          { value: firstResultHandlingWorklet },
          { value: secondResultHandlingWorklet },
        ],
      },
      {
        value: [{ value: [] }, { value: [] }],
      },
      undefined
    );
    const serializableArgumentBatch = jest.mocked(
      WorkletsModule.scheduleOnUI
    ).mock.calls[0][1] as unknown as {
      value: unknown[];
    };
    expect(serializableArgumentBatch.value[0]).toBe(
      serializableArgumentBatch.value[1]
    );
  });
});
