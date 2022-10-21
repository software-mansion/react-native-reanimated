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
  _setValue?: (val: AnimatableValue | Descriptor) => void;
}

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

function pushFrame(frame: (timestamp: Timestamp) => void): void {
  (NativeReanimatedModule as JSReanimated).pushFrame(frame);
}

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

let _getTimestamp: () => number;
if (nativeShouldBeMock()) {
  _getTimestamp = () => {
    return (NativeReanimatedModule as JSReanimated).getTimestamp();
  };
} else {
  _getTimestamp = () => {
    'worklet';
    if (_frameTimestamp) {
      return _frameTimestamp;
    }
    if (_eventTimestamp) {
      return _eventTimestamp;
    }
    return _getCurrentTime();
  };
}

export function getTimestamp(): number {
  'worklet';
  if (Platform.OS === 'web') {
    return (NativeReanimatedModule as JSReanimated).getTimestamp();
  }
  return _getTimestamp();
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

function workletValueSetter<T extends WorkletValue>(
  this: WorkletValueSetterContext,
  value: T
): void {
  'worklet';
  // TODO: we should be able to remove this as this is not being used anymore
}

// We cannot use pushFrame
// so we use own implementation for js
function workletValueSetterJS<T extends WorkletValue>(
  this: WorkletValueSetterContext,
  value: T
): void {
  const previousAnimation = this._animation;
  if (previousAnimation) {
    previousAnimation.cancelled = true;
    this._animation = null;
  }
  if (
    typeof value === 'function' ||
    (value !== null &&
      typeof value === 'object' &&
      (value as AnimationObject).onFrame)
  ) {
    // animated set
    const animation: AnimationObject =
      typeof value === 'function'
        ? (value as () => AnimationObject)()
        : (value as AnimationObject);
    let initializeAnimation: ((timestamp: number) => void) | null = (
      timestamp: number
    ) => {
      animation.onStart(animation, this.value, timestamp, previousAnimation);
    };
    const step = (timestamp: number) => {
      if (animation.cancelled) {
        animation.callback && animation.callback(false /* finished */);
        return;
      }
      if (initializeAnimation) {
        initializeAnimation(timestamp);
        initializeAnimation = null; // prevent closure from keeping ref to previous animation
      }
      const finished = animation.onFrame(animation, timestamp);
      animation.timestamp = timestamp;
      this._setValue && this._setValue(animation.current as AnimatableValue);
      if (finished) {
        animation.callback && animation.callback(true /* finished */);
      } else {
        requestFrame(step);
      }
    };

    this._animation = animation;

    requestFrame(step);
  } else {
    this._setValue && this._setValue(value as AnimatableValue | Descriptor);
  }
}

function valueUnpacker(objectToUnpack) {
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
      workletFun = eval('(' + objectToUnpack.asString + ')');
      workletsCache.set(objectToUnpack.__workletHash, workletFun);
    }
    return workletFun.bind(objectToUnpack);
  } else if (objectToUnpack.__init) {
    let value = handleCache.get(objectToUnpack);
    if (value === undefined) {
      value = objectToUnpack.__init();
      handleCache.set(objectToUnpack, value);
    }
    return value;
  } else {
    throw new Error('data type not recognized by unpack method');
  }
}

const _adaptCache = new WeakMap();

function makeShareableCloneRecursive(value) {
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

export function makeMutable<T>(initial: T): SharedValue<T> {
  if (__DEV__) {
    isConfiguredCheck();
  }
  const handle = makeShareableCloneRecursive({
    __init: () => {
      'worklet';

      const listeners = new Map();
      let value = initial;

      const self = {
        set value(newValue) {
          valueSetter(self, newValue);
        },
        get value() {
          return self._value;
        },
        set _value(newValue) {
          value = newValue;
          listeners.forEach((listener) => listener());
        },
        get _value() {
          return value;
        },
        addListener: (id, listener) => {
          listeners.set(id, listener);
        },
        removeListener: (id) => {
          listeners.delete(id);
        },
        _animation: null,
      };
      return self;
    },
  });
  const mutable = {
    set value(newValue) {
      runOnUI(() => {
        'worklet';
        mutable.value = newValue;
      })();
    },
    get value() {
      return initial;
    },
    __handle: handle,
  };
  return mutable;
}

export function makeRemote<T>(initial = {}): T {
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

let MAPPER_ID = 9999;

export function startMapper(
  worklet: () => void,
  inputs: any[] = [],
  outputs: any[] = [],
  updater: () => void = () => {
    // noop
  },
  viewDescriptors: Descriptor[] | SharedValue<Descriptor[]> = []
): number {
  if (__DEV__) {
    isConfiguredCheck();
  }

  const mapperID = (MAPPER_ID += 1);

  runOnUI(() => {
    'worklet';
    let mapperRegistry = global.__mapperRegistry;
    if (mapperRegistry === undefined) {
      mapperRegistry = global.__mapperRegistry = new Map();
    }
    const mapper = {
      dirty: false,
      worklet,
      inputs,
    };
    mapperRegistry.set(mapperID, mapper);
    function listener() {
      mapper.dirty = true;
      if (!global.__mapperRequestedFrame) {
        global.__mapperRequestedFrame = true;
        requestAnimationFrame(() => {
          mapperRegistry.forEach((mapper) => {
            mapper.worklet();
          });
          global.__mapperRequestedFrame = false;
        });
      }
    }
    for (const input of inputs) {
      input.addListener(mapperID, listener);
    }
  })();
}

export function stopMapper(mapperId: number): void {
  // NativeReanimatedModule.stopMapper(mapperId);
}

export interface RunOnJSFunction<A extends any[], R> {
  __callAsync?: (...args: A) => void;
  (...args: A): R;
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

export function doSomething() {
  function remoteFunction() {
    console.log('yollo');
  }
  const share = makeShareableCloneRecursive(remoteFunction);
  runOnUI(() => {
    'worklet';
    // _log('who dis ' + remoteFunction);
    runOnJS(remoteFunction)(1, 2, 3);
  })();
}

export function runOnJS<A extends any[], R>(
  fun: RunOnJSFunction<A, R>
): () => void {
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

NativeReanimatedModule.installCoreFunctions(
  NativeReanimatedModule.native
    ? (workletValueSetter as <T>(value: T) => void)
    : (workletValueSetterJS as <T>(value: T) => void),
  valueUnpacker
);

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
