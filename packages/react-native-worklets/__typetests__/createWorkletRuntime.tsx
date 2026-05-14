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
}
