import { createWorkletRuntime } from '../../src/runtimes';

export function createWorkletRuntimeTypeTests() {
  const initializer = () => {
    'worklet';
  };

  // Correct usage - config object
  createWorkletRuntime({
    name: 'test',
    initializer,
  });

  // Correct usage - deprecated positional parameters
  createWorkletRuntime('test', () => {
    'worklet';
    console.log('test');
  });

  // @ts-expect-error - Missing name in config object
  createWorkletRuntime({
    initializer,
  });

  // @ts-expect-error - Wrong name type in config object
  createWorkletRuntime({
    name: 123,
    initializer,
  });

  // @ts-expect-error - No parameters at all
  createWorkletRuntime();

  // @ts-expect-error - Not existing parameter
  createWorkletRuntime({
    name: 'test',
    test: 'test',
    initializer,
  });
}
