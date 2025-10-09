import * as Worklets from '../src/index';

describe('web API', () => {
  it('should have all exports available', () => {
    const WorkletAPI = [
      'isShareableRef',
      'makeShareable',
      'makeShareableCloneOnUIRecursive',
      'makeShareableCloneRecursive',
      'shareableMappingCache',
      'getStaticFeatureFlag',
      'setDynamicFeatureFlag',
      'isSynchronizable',
      'getRuntimeKind',
      'RuntimeKind',
      'createWorkletRuntime',
      'runOnRuntime',
      'scheduleOnRuntime',
      'createSerializable',
      'isSerializableRef',
      'serializableMappingCache',
      'createSynchronizable',
      'callMicrotasks',
      'executeOnUIRuntimeSync',
      'runOnJS',
      'runOnUI',
      'runOnUIAsync',
      'runOnUISync',
      'scheduleOnRN',
      'scheduleOnUI',
      'unstable_eventLoopTask',
      'isWorkletFunction',
      'WorkletsModule',
    ];

    // Check if all exports are available.
    expect(WorkletAPI.sort()).toEqual(Object.keys(Worklets).sort());

    const definedWorklets = WorkletAPI.filter((api) => {
      return Worklets[api as keyof typeof Worklets] !== undefined;
    }).map((api) => api);

    // Check if all exports are defined.
    expect(WorkletAPI.sort()).toEqual(definedWorklets.sort());
  });
});
