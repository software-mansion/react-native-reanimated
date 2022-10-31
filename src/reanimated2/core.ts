/* global _WORKLET _getCurrentTime _frameTimestamp _eventTimestamp _setGlobalConsole */
import NativeReanimatedModule from './NativeReanimated';
import { Platform } from 'react-native';
import { nativeShouldBeMock, shouldBeUseWeb, isWeb } from './PlatformChecker';
import {
  BasicWorkletFunction,
  ComplexWorkletFunction,
  SharedValue,
  AnimationObject,
  AnimatableValue,
  Timestamp,
  ShareableRef,
  Value3D,
  ValueRotation,
  WorkletFunction,
} from './commonTypes';
import { Descriptor } from './hook/commonTypes';
import JSReanimated from './js-reanimated/JSReanimated';

if (global._setGlobalConsole === undefined) {
  // it can happen when Reanimated plugin wasn't added, but the user uses the only API from version 1
  global._setGlobalConsole = () => {
    // noop
  };
}

export type ReanimatedConsole = Pick<
  Console,
  'debug' | 'log' | 'warn' | 'info' | 'error'
>;

export type WorkletValue =
  | (() => AnimationObject)
  | AnimationObject
  | AnimatableValue
  | Descriptor;

interface WorkletValueSetterContext {
  _animation?: AnimationObject | null;
  _value?: AnimatableValue | Descriptor;
  value?: AnimatableValue;
}

// interface SharedValuePrivate<T> extends SharedValue<T> {}

const testWorklet: BasicWorkletFunction<void> = () => {
  'worklet';
};

const throwUninitializedReanimatedException = () => {
  throw new Error(
    "Failed to initialize react-native-reanimated library, make sure you followed installation steps here: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/ \n1) Make sure reanimated's babel plugin is installed in your babel.config.js (you should have 'react-native-reanimated/plugin' listed there - also see the above link for details) \n2) Make sure you reset build cache after updating the config, run: yarn start --reset-cache"
  );
};

export const checkPluginState: (throwError: boolean) => boolean = (
  throwError = true
) => {
  if (!testWorklet.__workletHash && !shouldBeUseWeb()) {
    if (throwError) {
      throwUninitializedReanimatedException();
    }
    return false;
  }
  return true;
};

export const isConfigured: (throwError?: boolean) => boolean = (
  throwError = false
) => {
  return checkPluginState(throwError);
};

export const isConfiguredCheck: () => void = () => {
  checkPluginState(true);
};

export function requestFrame(frame: (timestamp: Timestamp) => void): void {
  'worklet';
  if (NativeReanimatedModule.native) {
    requestAnimationFrame(frame);
  } else {
    // pushFrame(frame);
  }
}

global._WORKLET = false;
global._log = function (s: string) {
  console.log(s);
};

export function runOnUI<A extends any[], R>(
  worklet: ComplexWorkletFunction<A, R>
): (...args: A) => void {
  return (...args) => {
    NativeReanimatedModule.scheduleOnUI(
      makeShareableCloneRecursive(() => {
        'worklet';
        return worklet(...args);
      })
    );
  };
}

export function makeShareable<T>(value: T): T {
  if (__DEV__) {
    isConfiguredCheck();
  }
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return value;
    },
  });
  value.__handle = handle;
  return value;
}

export function getViewProp<T>(viewTag: string, propName: string): Promise<T> {
  if (global._IS_FABRIC) {
    throw new Error(
      '[react-native-reanimated] `getViewProp` is not supported on Fabric yet'
    );
  }

  return new Promise((resolve, reject) => {
    return NativeReanimatedModule.getViewProp(
      viewTag,
      propName,
      (result: T) => {
        if (typeof result === 'string' && result.substr(0, 6) === 'error:') {
          reject(result);
        } else {
          resolve(result);
        }
      }
    );
  });
}

export function getTimestamp(): number {
  'worklet';
  return global._getTimestamp();
}

function valueSetter<T extends WorkletValue>(
  sv: WorkletValueSetterContext,
  value: T
): void {
  'worklet';
  const previousAnimation = sv._animation;
  if (previousAnimation) {
    previousAnimation.cancelled = true;
    sv._animation = null;
  }
  if (
    typeof value === 'function' ||
    (value !== null &&
      typeof value === 'object' &&
      (value as AnimationObject).onFrame !== undefined)
  ) {
    const animation: AnimationObject =
      typeof value === 'function'
        ? (value as () => AnimationObject)()
        : (value as AnimationObject);
    // prevent setting again to the same value
    // and triggering the mappers that treat this value as an input
    // this happens when the animation's target value(stored in animation.current until animation.onStart is called) is set to the same value as a current one(this._value)
    // built in animations that are not higher order(withTiming, withSpring) hold target value in .current
    if (sv._value === animation.current && !animation.isHigherOrder) {
      animation.callback && animation.callback(true);
      return;
    }
    // animated set
    const initializeAnimation = (timestamp: number) => {
      animation.onStart(animation, sv.value, timestamp, previousAnimation);
    };
    initializeAnimation(getTimestamp());
    const step = (timestamp: number) => {
      if (animation.cancelled) {
        animation.callback && animation.callback(false /* finished */);
        return;
      }
      const finished = animation.onFrame(animation, timestamp);
      animation.finished = true;
      animation.timestamp = timestamp;
      sv._value = animation.current;
      if (finished) {
        animation.callback && animation.callback(true /* finished */);
      } else {
        requestAnimationFrame(step);
      }
    };

    sv._animation = animation;

    if (_frameTimestamp) {
      // frame
      step(_frameTimestamp);
    } else {
      requestAnimationFrame(step);
    }
  } else {
    // prevent setting again to the same value
    // and triggering the mappers that treat this value as an input
    if (sv._value === value) {
      return;
    }
    sv._value = value as Descriptor | AnimatableValue;
  }
}

function valueUnpacker(objectToUnpack: any): any {
  'worklet';
  let workletsCache = global.__workletsCache;
  let handleCache = global.__handleCache;
  if (workletsCache === undefined) {
    // init
    workletsCache = global.__workletsCache = new Map();
    handleCache = global.__handleCache = new WeakMap();
  }
  if (objectToUnpack.__workletHash) {
    let workletFun = workletsCache.get(objectToUnpack.__workletHash);
    if (workletFun === undefined) {
      // eslint-disable-next-line no-eval
      workletFun = eval('(' + objectToUnpack.asString + ')') as (
        ...args: any[]
      ) => any;
      workletsCache.set(objectToUnpack.__workletHash, workletFun);
    }
    return workletFun.bind(objectToUnpack);
  } else if (objectToUnpack.__init) {
    let value = handleCache!.get(objectToUnpack);
    if (value === undefined) {
      value = objectToUnpack.__init() as object;
      handleCache!.set(objectToUnpack, value);
    }
    return value;
  } else {
    throw new Error('data type not recognized by unpack method');
  }
}

const _adaptCache = new WeakMap<object, ShareableRef>();

function makeShareableCloneRecursive<T>(value: T): ShareableRef {
  // This one actually may be worth to be moved to c++, we also need similar logic to run on the UI thread
  const type = typeof value;
  if ((type === 'object' || type === 'function') && value !== null) {
    const cached = _adaptCache.get(value);
    if (cached !== undefined) {
      return cached;
    } else if (value.__handle) {
      // "handle objects" as on the RN side they represent a handle to an object that
      // lives on the JS side. Here they are represented by an object with __handle field
      // while we want the UI thread to see the actual value constructed on the UI side.
      // We therefore return the handle object expecting it already has been transformed
      // into a shareable of the HandleType.
      return value.__handle;
    } else {
      let toAdapt;
      if (Array.isArray(value)) {
        toAdapt = value.map((element) => makeShareableCloneRecursive(element));
      } else if (type === 'function' && value.__workletHash === undefined) {
        // this is a remote function
        // throw new Error('adapt remote fun ' + value.name);
        toAdapt = value;
      } else {
        toAdapt = {};
        for (const [key, element] of Object.entries(value)) {
          toAdapt[key] = makeShareableCloneRecursive(element);
        }
      }
      // TODO: we want to freeze here actually but can't becayse makeShareable set's __handle field on a converted object
      // This case should be made available in some other way and allow for Object.freeze to be called here.
      // Object.freeze(value);
      const adopted = NativeReanimatedModule.makeShareableClone(toAdapt);
      _adaptCache.set(value, adopted);
      return adopted;
    }
  }
  return NativeReanimatedModule.makeShareableClone(value);
}

export function makeMutable<T>(
  initial: T,
  needSynchronousReadsFromReact = false
): SharedValue<T> {
  if (__DEV__) {
    isConfiguredCheck();
  }
  let value = initial;
  let baseListener: (value: T) => void | undefined;
  if (needSynchronousReadsFromReact) {
    function updateOnJS(newValue: T) {
      value = newValue;
    }
    baseListener = (newValue: T) => {
      'worklet';
      runOnJS(updateOnJS)(newValue);
    };
  }
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';

      const listeners = new Map();
      let value = initial;

      if (baseListener) {
        listeners.set(0, baseListener);
      }

      const self = {
        set value(newValue) {
          valueSetter(self, newValue);
        },
        get value(): T {
          return self._value;
        },
        set _value(newValue: T) {
          value = newValue;
          listeners.forEach((listener) => {
            listener(newValue);
          });
        },
        get _value(): T {
          return value;
        },
        addListener: (id: number, listener: (newValue: T) => void) => {
          listeners.set(id, listener);
        },
        removeListener: (id: number) => {
          listeners.delete(id);
        },
        _animation: null,
      };
      return self;
    },
  });
  const mutable = {
    set value(newValue) {
      value = newValue;
      runOnUI(() => {
        'worklet';
        mutable.value = newValue;
      })();
    },
    get value() {
      return value;
    },
    modify: (modifier: (value: T) => T) => {
      runOnUI(() => {
        'worklet';
        mutable.value = modifier(mutable.value);
      })();
    },
    addListener: (listenerId: number, listener: (value: T) => void) => {
      throw new Error('adding listeners is only possible on the UI runtime');
    },
    removeListener: (listenerId: number) => {
      throw new Error('removing listeners is only possible on the UI runtime');
    },
    __handle: handle,
  };
  return mutable;
}

export function makeRemote<T extends object>(initial = {}): T {
  if (__DEV__) {
    isConfiguredCheck();
  }
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';
      return initial;
    },
  });
  return {
    __handle: handle,
  };
}

type Mapper = {
  id: number;
  dirty: boolean;
  worklet: () => void;
  inputs: SharedValue[];
  outputs?: SharedValue[];
};

function createMapperRegistry() {
  'worklet';
  const mappers = new Map();
  let sortedMappers: Mapper[] = [];

  let frameRequested = false;

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

  function mapperFrame() {
    if (mappers.size !== sortedMappers.length) {
      updateMappersOrder();
    }
    for (const mapper of sortedMappers) {
      mapper.worklet();
    }
    frameRequested = false;
  }

  function maybeRequestUpdates() {
    if (!frameRequested) {
      requestAnimationFrame(mapperFrame);
      frameRequested = true;
    }
  }

  function extractInputs(inputs: any, resultArray: SharedValue[]) {
    if (Array.isArray(inputs)) {
      for (const input of inputs) {
        extractInputs(input, resultArray);
      }
    } else if (inputs.addListener) {
      resultArray.push(inputs);
    } else if (typeof inputs === 'object') {
      for (const element of Object.values(inputs)) {
        extractInputs(element, resultArray);
      }
    }
    return resultArray;
  }

  return {
    start: (
      mapperID: number,
      worklet: () => void,
      inputs: SharedValue[],
      outputs?: SharedValue[]
    ) => {
      const mapper = {
        id: mapperID,
        dirty: true,
        worklet,
        inputs: extractInputs(inputs, []),
        outputs,
      };
      mappers.set(mapper.id, mapper);
      sortedMappers = [];
      for (const sv of mapper.inputs) {
        sv.addListener(mapper.id, () => {
          mapper.dirty = true;
          maybeRequestUpdates();
        });
      }
    },
    stop: (mapperID: number) => {
      const mapper = mappers.get(mapperID);
      if (mapper) {
        mappers.delete(mapper.id);
        sortedMappers = [];
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
  inputs: any[] = [],
  outputs: any[] = []
): number {
  if (__DEV__) {
    isConfiguredCheck();
  }

  const mapperID = (MAPPER_ID += 1);

  runOnUI(() => {
    'worklet';
    let mapperRegistry = global.__mapperRegistry;
    if (mapperRegistry === undefined) {
      mapperRegistry = global.__mapperRegistry = createMapperRegistry();
    }
    mapperRegistry.start(mapperID, worklet, inputs, outputs);
  })();

  return mapperID;
}

export function stopMapper(mapperID: number): void {
  runOnUI(() => {
    'worklet';
    const mapperRegistry = global.__mapperRegistry;
    mapperRegistry?.stop(mapperID);
  });
}

function makeShareableCloneOnUIRecursive(value) {
  'worklet';
  function cloneRecursive(value) {
    const type = typeof value;
    if ((type === 'object' || type === 'function') && value !== null) {
      let toAdapt;
      if (Array.isArray(value)) {
        toAdapt = value.map((element) => cloneRecursive(element));
      } else {
        toAdapt = {};
        for (const [key, element] of Object.entries(value)) {
          toAdapt[key] = cloneRecursive(element);
        }
      }
      Object.freeze(value);
      return _makeShareableClone(toAdapt);
    }
    return _makeShareableClone(value);
  }
  return cloneRecursive(value);
}

export function runOnJS<A extends any[], R>(
  fun: ComplexWorkletFunction<A, R>
): (...args: A) => void {
  'worklet';
  if (!_WORKLET) {
    return fun;
  }
  return (...args) => {
    _scheduleOnJS(
      fun,
      args.length > 0 ? makeShareableCloneOnUIRecursive(args) : undefined
    );
  };
}

export function registerEventHandler<T>(
  eventHash: string,
  eventHandler: (event: T) => void
): string {
  return NativeReanimatedModule.registerEventHandler(
    eventHash,
    makeShareableCloneRecursive(eventHandler)
  );
}

export function unregisterEventHandler(id: string): void {
  return NativeReanimatedModule.unregisterEventHandler(id);
}

export function subscribeForKeyboardEvents(
  eventHandler: (state: number, height: number) => void
): number {
  return NativeReanimatedModule.subscribeForKeyboardEvents(
    makeShareableCloneRecursive(eventHandler)
  );
}

export function unsubscribeFromKeyboardEvents(listenerId: number): void {
  return NativeReanimatedModule.unsubscribeFromKeyboardEvents(listenerId);
}

export function registerSensor(
  sensorType: number,
  interval: number,
  eventHandler: (data: Value3D | ValueRotation) => void
): number {
  return NativeReanimatedModule.registerSensor(
    sensorType,
    interval,
    makeShareableCloneRecursive(eventHandler)
  );
}

export function unregisterSensor(listenerId: number): void {
  return NativeReanimatedModule.unregisterSensor(listenerId);
}

NativeReanimatedModule.installCoreFunctions(valueUnpacker);

if (!isWeb() && isConfigured()) {
  const capturableConsole = console;
  runOnUI(() => {
    'worklet';
    const console = {
      debug: runOnJS(capturableConsole.debug),
      log: runOnJS(capturableConsole.log),
      warn: runOnJS(capturableConsole.warn),
      error: runOnJS(capturableConsole.error),
      info: runOnJS(capturableConsole.info),
    };
    _setGlobalConsole(console);
  })();
}

type FeaturesConfig = {
  enableLayoutAnimations: boolean;
  setByUser: boolean;
};

let featuresConfig: FeaturesConfig = {
  enableLayoutAnimations: false,
  setByUser: false,
};

export function enableLayoutAnimations(
  flag: boolean,
  isCallByUser = true
): void {
  if (isCallByUser) {
    featuresConfig = {
      enableLayoutAnimations: flag,
      setByUser: true,
    };
    NativeReanimatedModule.enableLayoutAnimations(flag);
  } else if (
    !featuresConfig.setByUser &&
    featuresConfig.enableLayoutAnimations !== flag
  ) {
    featuresConfig.enableLayoutAnimations = flag;
    NativeReanimatedModule.enableLayoutAnimations(flag);
  }
}

export function configureProps(uiProps: string[], nativeProps: string[]): void {
  if (!nativeShouldBeMock()) {
    NativeReanimatedModule.configureProps(uiProps, nativeProps);
  }
}

export function jestResetJsReanimatedModule() {
  (NativeReanimatedModule as JSReanimated).jestResetModule();
}
