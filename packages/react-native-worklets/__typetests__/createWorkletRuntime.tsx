import { createWorkletRuntime } from '..';

export function createWorkletRuntimeTypeTests() {
  const initializer = () => {
    'worklet';
  };

  // Correct usage - no parameters at all.
  createWorkletRuntime();

  // Correct usage - empty config object.
  createWorkletRuntime({});

  // Correct usage - config object with name.
  createWorkletRuntime({
    name: 'test',
  });

  // Correct usage - config object with initializer.
  createWorkletRuntime({
    initializer,
  });

  // Correct usage - config object with a custom queue.
  createWorkletRuntime({
    queue: {},
  });

  // Correct usage - config object with the default queue sentinel.
  createWorkletRuntime({
    queue: 'default',
  });

  // Correct usage - config object with no queue.
  createWorkletRuntime({
    queue: null,
  });

  // Correct usage - config object with useDefaultQueue = true.
  createWorkletRuntime({
    useDefaultQueue: true,
  });

  // Correct usage - config object with useDefaultQueue = false.
  createWorkletRuntime({
    useDefaultQueue: false,
  });

  // Correct usage - config object with useDefaultQueue = false and customQueue.
  createWorkletRuntime({
    useDefaultQueue: false,
    customQueue: {},
  });

  // Correct usage - deprecated positional parameters
  createWorkletRuntime('test', initializer);

  // @ts-expect-error - Wrong name type in config object
  createWorkletRuntime({
    name: 123,
  });

  // @ts-expect-error - Not existing parameter
  createWorkletRuntime({
    name: 'test',
    test: 'test',
    initializer,
  });

  // @ts-expect-error - Unknown queue sentinel string
  createWorkletRuntime({
    queue: 'custom',
  });

  // @ts-expect-error - Using both useDefaultQueue and customQueue
  createWorkletRuntime({
    useDefaultQueue: true,
    customQueue: {},
  });

  // @ts-expect-error - Mixing new `queue` with deprecated `useDefaultQueue`/`customQueue`
  createWorkletRuntime({
    queue: 'default',
    useDefaultQueue: false,
    customQueue: {},
  });
}
