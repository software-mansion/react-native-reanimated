import type { SharedValue } from '../src/commonTypes';
import type * as Mappers from '../src/mappers.native';

jest.mock('react-native-worklets', () => ({
  ...jest.requireActual('react-native-worklets'),
  scheduleOnUI: (worklet: () => void) => worklet(),
}));

type FakeSharedValue = SharedValue<number> & { set: (value: number) => void };

function makeSharedValue(initial: number): FakeSharedValue {
  const listeners = new Map<number, () => void>();
  let current = initial;
  return {
    _isReanimatedSharedValue: true,
    get value() {
      return current;
    },
    addListener: (id: number, listener: () => void) => {
      listeners.set(id, listener);
    },
    removeListener: (id: number) => {
      listeners.delete(id);
    },
    set: (value: number) => {
      current = value;
      listeners.forEach((listener) => listener());
    },
  } as unknown as FakeSharedValue;
}

describe('mapper scheduling on native', () => {
  let queuedFinalizers: (() => void)[];
  let savedFinalizerScheduler: typeof globalThis.requestAnimationFrameFinalizer;
  let startMapper: typeof Mappers.startMapper;
  let stopMapper: typeof Mappers.stopMapper;

  function runFrame() {
    const finalizers = queuedFinalizers;
    queuedFinalizers = [];
    for (const finalizer of finalizers) {
      finalizer();
    }
  }

  beforeEach(() => {
    jest.resetModules();
    queuedFinalizers = [];
    savedFinalizerScheduler = globalThis.requestAnimationFrameFinalizer;
    globalThis.requestAnimationFrameFinalizer = (finalizer) => {
      queuedFinalizers.push(finalizer);
    };
    global.__mapperRegistry = undefined;
    ({ startMapper, stopMapper } = jest.requireActual<typeof Mappers>(
      '../src/mappers.native'
    ));
  });

  afterEach(() => {
    globalThis.requestAnimationFrameFinalizer = savedFinalizerScheduler;
    global.__mapperRegistry = undefined;
  });

  test('runs a new mapper and then stops scheduling runs', () => {
    const input = makeSharedValue(0);
    const worklet = jest.fn();

    startMapper(worklet, [input]);
    runFrame();

    expect(worklet).toHaveBeenCalledTimes(1);
    expect(queuedFinalizers).toHaveLength(0);
  });

  test('schedules a single run when an input changes', () => {
    const input = makeSharedValue(0);
    const worklet = jest.fn();
    startMapper(worklet, [input]);
    runFrame();

    input.set(1);
    input.set(2);

    expect(queuedFinalizers).toHaveLength(1);
    runFrame();
    expect(worklet).toHaveBeenCalledTimes(2);
    expect(queuedFinalizers).toHaveLength(0);
  });

  test('runs a requested finalizer outside of a mapper run', () => {
    const input = makeSharedValue(0);
    startMapper(jest.fn(), [input]);
    runFrame();
    const finalizer = jest.fn();

    global.__requestMapperRunFinalizer(finalizer);

    expect(queuedFinalizers).toHaveLength(1);
    runFrame();
    expect(finalizer).toHaveBeenCalledTimes(1);
    expect(queuedFinalizers).toHaveLength(0);
  });

  test('runs a finalizer requested by a mapper in the same run', () => {
    const input = makeSharedValue(0);
    const finalizer = jest.fn();
    startMapper(() => {
      global.__requestMapperRunFinalizer(finalizer);
    }, [input]);

    runFrame();

    expect(finalizer).toHaveBeenCalledTimes(1);
    expect(queuedFinalizers).toHaveLength(0);
  });

  test('stops listening to the inputs of a stopped mapper', () => {
    const input = makeSharedValue(0);
    const worklet = jest.fn();
    const mapperId = startMapper(worklet, [input]);
    runFrame();

    stopMapper(mapperId);
    runFrame();
    input.set(1);

    expect(queuedFinalizers).toHaveLength(0);
    expect(worklet).toHaveBeenCalledTimes(1);
  });
});
