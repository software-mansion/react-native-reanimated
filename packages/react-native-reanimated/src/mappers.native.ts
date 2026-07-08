'use strict';

import { scheduleOnUI } from 'react-native-worklets';

import type { MapperOutputs, MapperRawInputs } from './commonTypes';
import { isSharedValue } from './isSharedValue';
import type { Mapper, MapperExtractedInputs } from './mappersCommon';

function createMapperRegistry() {
  'worklet';
  const mappers = new Map<number, Mapper>();
  let sortedMappers: Mapper[] = [];

  let processingMappers = false;

  function updateMappersOrder() {
    // sort mappers topologically
    // the algorithm here takes advantage of a fact that the topological order
    // of a transposed graph is a reverse topological order of the original graph
    // The graph in our case consists of mappers and an edge between two mappers
    // A and B exists if there is a shared value that's on A's output lists and on
    // B's input list.
    //
    // We don't need however to calculate that graph as it is easier to work with
    // the transposed version of it that can be calculated ad-hoc. For the transposed
    // version to be traversed we use "pre" map that maps share value to mappers that
    // output that shared value. Then we can infer all the outgoing edges for a given
    // mapper simply by scanning it's input list and checking if any of the shared values
    // from that list exists in the "pre" map. If they do, then we have an edge between
    // that mapper and the mappers from the "pre" list for the given shared value.
    //
    // For topological sorting we use a dfs-based approach that requires the graph to
    // be traversed in dfs order and each node after being processed lands at the
    // beginning of the topological order list. Since we traverse a transposed graph,
    // instead of reversing that order we can use a normal array and push processed
    // mappers to the end. There is no need to reverse that array after we are done.
    const pre = new Map(); // map from sv -> mapper that outputs that sv
    mappers.forEach((mapper) => {
      if (mapper.outputs) {
        for (const output of mapper.outputs) {
          const preMappers = pre.get(output);
          if (preMappers === undefined) {
            pre.set(output, [mapper]);
          } else {
            preMappers.push(mapper);
          }
        }
      }
    });
    const visited = new Set();
    const newOrder: Mapper[] = [];
    function dfs(mapper: Mapper) {
      visited.add(mapper);
      for (const input of mapper.inputs) {
        const preMappers = pre.get(input);
        if (preMappers) {
          for (const preMapper of preMappers) {
            if (!visited.has(preMapper)) {
              dfs(preMapper);
            }
          }
        }
      }
      newOrder.push(mapper);
    }
    mappers.forEach((mapper) => {
      if (!visited.has(mapper)) {
        dfs(mapper);
      }
    });
    sortedMappers = newOrder;
  }

  let mapperRunFinalizers: (() => void)[] = [];
  global.__requestMapperRunFinalizer = (finalizer: () => void) => {
    mapperRunFinalizers.push(finalizer);
  };

  let isAnyMapperDirty = false;

  function mapperRun() {
    if (processingMappers) {
      return;
    }
    try {
      processingMappers = true;
      if (mappers.size !== sortedMappers.length) {
        updateMappersOrder();
      }
      if (isAnyMapperDirty) {
        isAnyMapperDirty = false;
        for (const mapper of sortedMappers) {
          if (mapper.dirty) {
            mapper.dirty = false;
            mapper.worklet();
          }
        }
      }
    } finally {
      processingMappers = false;
      const finalizers = mapperRunFinalizers;
      mapperRunFinalizers = [];
      for (const finalizer of finalizers) {
        finalizer();
      }
    }
  }

  const schedulingFunction = globalThis.requestAnimationFrameFinalizer;

  function scheduledMapperRun() {
    mapperRun();
    // We always run mappers on native.
    schedulingFunction(scheduledMapperRun);
  }

  schedulingFunction(scheduledMapperRun);

  global.__mapperRun = mapperRun;

  function extractInputs(
    inputs: unknown,
    resultArray: MapperExtractedInputs
  ): MapperExtractedInputs {
    if (Array.isArray(inputs)) {
      for (const input of inputs) {
        if (input) {
          extractInputs(input, resultArray);
        }
      }
    } else if (isSharedValue(inputs)) {
      resultArray.push(inputs);
    } else if (Object.getPrototypeOf(inputs) === Object.prototype) {
      // we only extract inputs recursively from "plain" objects here, if object
      // is of a derivative class (e.g. HostObject on web, or Map) we don't scan
      // it recursively
      for (const element of Object.values(inputs as Record<string, unknown>)) {
        if (element) {
          extractInputs(element, resultArray);
        }
      }
    }
    return resultArray;
  }

  return {
    start: (
      mapperID: number,
      worklet: () => void,
      inputs: MapperRawInputs,
      outputs?: MapperOutputs
    ) => {
      const mapper: Mapper = {
        id: mapperID,
        dirty: true,
        worklet,
        inputs: extractInputs(inputs, []),
        outputs,
      };
      mappers.set(mapper.id, mapper);
      sortedMappers = [];
      isAnyMapperDirty = true;
      for (const sv of mapper.inputs) {
        sv.addListener(mapper.id, () => {
          mapper.dirty = true;
          isAnyMapperDirty = true;
        });
      }
    },
    stop: (mapperID: number) => {
      const mapper = mappers.get(mapperID);
      if (mapper) {
        mappers.delete(mapper.id);
        sortedMappers = [];
        isAnyMapperDirty = true;
        for (const sv of mapper.inputs) {
          sv.removeListener(mapper.id);
        }
      }
    },
  };
}

let MAPPER_ID = 9999;

export function startMapper(
  worklet: () => void,
  inputs: MapperRawInputs = [],
  outputs: MapperOutputs = []
): number {
  const mapperID = (MAPPER_ID += 1);

  scheduleOnUI(() => {
    let mapperRegistry = global.__mapperRegistry;
    if (mapperRegistry === undefined) {
      mapperRegistry = global.__mapperRegistry = createMapperRegistry();
    }
    mapperRegistry.start(mapperID, worklet, inputs, outputs);
  });

  return mapperID;
}

export function stopMapper(mapperID: number): void {
  scheduleOnUI(() => {
    const mapperRegistry = global.__mapperRegistry;
    mapperRegistry?.stop(mapperID);
  });
}
