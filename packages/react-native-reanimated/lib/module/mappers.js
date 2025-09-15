'use strict';

import { runOnUI } from 'react-native-worklets';
import { IS_JEST } from './common';
import { isSharedValue } from './isSharedValue';
function createMapperRegistry() {
  'worklet';

  const mappers = new Map();
  let sortedMappers = [];
  let runRequested = false;
  let processingMappers = false;
  function updateMappersOrder() {
    // sort mappers topologically
    // the algorithm here takes adventage of a fact that the topological order
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
    mappers.forEach(mapper => {
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
    const newOrder = [];
    function dfs(mapper) {
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
    mappers.forEach(mapper => {
      if (!visited.has(mapper)) {
        dfs(mapper);
      }
    });
    sortedMappers = newOrder;
  }
  function mapperRun() {
    runRequested = false;
    if (processingMappers) {
      return;
    }
    try {
      processingMappers = true;
      if (mappers.size !== sortedMappers.length) {
        updateMappersOrder();
      }
      for (const mapper of sortedMappers) {
        if (mapper.dirty) {
          mapper.dirty = false;
          mapper.worklet();
        }
      }
    } finally {
      processingMappers = false;
    }
  }
  function maybeRequestUpdates() {
    if (IS_JEST) {
      // On Jest environment we avoid using queueMicrotask as that'd require test
      // to advance the clock manually. This on other hand would require tests
      // to know how many times mappers need to run. As we don't want tests to
      // make any assumptions on that number it is easier to execute mappers
      // immediately for testing purposes and only expect test to advance timers
      // if they want to make any assertions on the effects of animations being run.
      mapperRun();
    } else if (!runRequested) {
      if (processingMappers) {
        // In general, we should avoid having mappers trigger updates as this may
        // result in unpredictable behavior. Specifically, the updated value can
        // be read by mappers that run later in the same frame but previous mappers
        // would access the old value. Updating mappers during the mapper-run phase
        // breaks the order in which we should execute the mappers. However, doing
        // that is still a possibility and there are some instances where people use
        // the API in that way, hence we need to prevent mapper-run phase falling into
        // an infinite loop. We do that by detecting when mapper-run is requested while
        // we are already in mapper-run phase, and in that case we use `requestAnimationFrame`
        // instead of `queueMicrotask` which will schedule mapper run for the next
        // frame instead of queuing another set of updates in the same frame.
        requestAnimationFrame(mapperRun);
      } else {
        queueMicrotask(mapperRun);
      }
      runRequested = true;
    }
  }
  function extractInputs(inputs, resultArray) {
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
      for (const element of Object.values(inputs)) {
        if (element) {
          extractInputs(element, resultArray);
        }
      }
    }
    return resultArray;
  }
  return {
    start: (mapperID, worklet, inputs, outputs) => {
      const mapper = {
        id: mapperID,
        dirty: true,
        worklet,
        inputs: extractInputs(inputs, []),
        outputs
      };
      mappers.set(mapper.id, mapper);
      sortedMappers = [];
      for (const sv of mapper.inputs) {
        sv.addListener(mapper.id, () => {
          mapper.dirty = true;
          maybeRequestUpdates();
        });
      }
      maybeRequestUpdates();
    },
    stop: mapperID => {
      const mapper = mappers.get(mapperID);
      if (mapper) {
        mappers.delete(mapper.id);
        sortedMappers = [];
        for (const sv of mapper.inputs) {
          sv.removeListener(mapper.id);
        }
      }
    }
  };
}
let MAPPER_ID = 9999;
export function startMapper(worklet, inputs = [], outputs = []) {
  const mapperID = MAPPER_ID += 1;
  runOnUI(() => {
    let mapperRegistry = global.__mapperRegistry;
    if (mapperRegistry === undefined) {
      mapperRegistry = global.__mapperRegistry = createMapperRegistry();
    }
    mapperRegistry.start(mapperID, worklet, inputs, outputs);
  })();
  return mapperID;
}
export function stopMapper(mapperID) {
  runOnUI(() => {
    const mapperRegistry = global.__mapperRegistry;
    mapperRegistry?.stop(mapperID);
  })();
}
//# sourceMappingURL=mappers.js.map