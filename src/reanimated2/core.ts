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
    pushFrame(frame);
  }
}

global._WORKLET = false;
global._log = function (s: string) {
  console.log(s);
};

export function runOnUI<A extends any[], R>(
  worklet: ComplexWorkletFunction<A, R>
): (...args: A) => void {
  return makeShareable(worklet);
}

export function makeShareable<T>(value: T): T {
  if (__DEV__) {
    isConfiguredCheck();
  }
  return NativeReanimatedModule.makeShareable(value);
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

function workletValueSetter<T extends WorkletValue>(
  this: WorkletValueSetterContext,
  value: T
): void {
  'worklet';
  const previousAnimation = this._animation;
  if (previousAnimation) {
    previousAnimation.cancelled = true;
    this._animation = null;
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
    if (this._value === animation.current && !animation.isHigherOrder) {
      animation.callback && animation.callback(true);
      return;
    }
    // animated set
    const initializeAnimation = (timestamp: number) => {
      animation.onStart(animation, this.value, timestamp, previousAnimation);
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
      this._value = animation.current;
      if (finished) {
        animation.callback && animation.callback(true /* finished */);
      } else {
        requestAnimationFrame(step);
      }
    };

    this._animation = animation;

    if (_frameTimestamp) {
      // frame
      step(_frameTimestamp);
    } else {
      requestAnimationFrame(step);
    }
  } else {
    // prevent setting again to the same value
    // and triggering the mappers that treat this value as an input
    if (this._value === value) {
      return;
    }
    this._value = value as Descriptor | AnimatableValue;
  }
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
  let reactiveCache = global.__reactiveCache;
  if (workletsCache === undefined) {
    // init
    workletsCache = global.__workletsCache = new Map();
    reactiveCache = global.__reactiveCache = new WeakMap();
  }
  if (objectToUnpack.__workletHash) {
    let workletFun = workletsCache.get(objectToUnpack.__workletHash);
    if (workletFun === undefined) {
      _log(objectToUnpack.asString);
      workletFun = eval('(' + objectToUnpack.asString + ')');
      workletsCache.set(objectToUnpack.__workletHash, workletFun);
    }
    return () => {
      jsThis = objectToUnpack;
      try {
        workletFun();
      } catch (e) {
        _log('error');
        _log(e.toString());
      }
    };
  } else {
    // reactive?
    let reactive = reactiveCache.get(objectToUnpack);
    if (reactive !== undefined) {
      const data = {
        value: objectToUnpack.__initial,
        weakReactiveHandle: new WeakRef(objectToUnpack),
        revision: 1,
      };

      reactive = {
        set value(newValue) {
          data.value = newValue;
          data.revision += 1;
          const reactiveHandle = data.weakReactiveHandle.deref();
          if (reactiveHandle) {
            // _notifyReactiveUpdate(reactiveHandle);
          }
        },
        get value() {
          return data.value;
        },
      };
      reactiveCache.set(objectToUnpack, reactive);
    }
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
    } else {
      let toAdapt;
      if (Array.isArray(value)) {
        toAdapt = value.map((element) => makeShareableCloneRecursive(element));
      } else {
        toAdapt = {};
        for (const [key, element] of Object.entries(value)) {
          toAdapt[key] = makeShareableCloneRecursive(element);
        }
      }
      Object.freeze(value);
      const adapted = NativeReanimatedModule.makeShareableClone(toAdapt);
      _adaptCache.set(value, adapted);
      return adapted;
    }
  }
  return NativeReanimatedModule.makeShareableClone(value);
}

function makeSharedValue(initial) {
  const data = {
    value: initial,
    revision: 1,
    reactive: NativeReanimatedModule.makeReactiveValue(
      makeShareableCloneRecursive(initial)
    ),
  };
  return {
    set value(newValue) {
      NativeReanimatedModule.updateReactiveValue(
        data.reactive,
        makeShareableCloneRecursive(newValue)
      );
    },
    get value() {
      return undefined;
    },
  };
}

export function doSomething() {
  // const before = {
  //   a: 14,
  //   b: 'hello',
  //   c: [1, 2, { x: 8 }, 'yollo'],
  // };
  // const data = makeShareableCloneRecursive(before);

  // function anotherWork() {
  //   'worklet';
  //   console.log('Can run me too');
  // }

  const sv = makeSharedValue(7);
  // _adaptCache.set(reactive, reactive);
  // console.log('reactio', Object.getPrototypeOf(reactive));

  // function work() {
  //   'worklet';
  //   console.log('hellow from the UI thread', reactive.value);
  //   // anotherWork();
  // }
  // const shareableWork = makeShareableCloneRecursive(work);
  // NativeReanimatedModule.scheduleOnUI(shareableWork);
  // setTimeout(() => {
  //   reactive.value = makeShareableCloneRecursive(8);
  //   NativeReanimatedModule.scheduleOnUI(shareableWork);
  // }, 500);

  const work = makeShareableCloneRecursive(() => {
    'worklet';
    _log('yollo');
    const u = {
      set something(sth) {
        _log('setting' + sth);
      },
    };
    // class Sth {
    // set something(sth) {
    //   _log('setting' + sth);
    // }
    // }
    // const u = new Sth();
    u.something = 7;
  });

  NativeReanimatedModule.startMapper2(
    work,
    [reactive],
    [],
    undefined,
    undefined
  );

  setTimeout(() => {
    sv.value = 8;
  }, 500);

  // console.log('DATA', before, reacitve.value);
}

export function makeMutable<T>(value: T): SharedValue<T> {
  if (__DEV__) {
    isConfiguredCheck();
  }
  return NativeReanimatedModule.makeMutable(value);
}

export function makeRemote<T>(object = {}): T {
  if (__DEV__) {
    isConfiguredCheck();
  }
  return NativeReanimatedModule.makeRemote(object);
}

export function startMapper(
  mapper: () => void,
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
  return NativeReanimatedModule.startMapper(
    mapper,
    inputs,
    outputs,
    updater,
    viewDescriptors
  );
}

export function stopMapper(mapperId: number): void {
  NativeReanimatedModule.stopMapper(mapperId);
}

export interface RunOnJSFunction<A extends any[], R> {
  __callAsync?: (...args: A) => void;
  (...args: A): R;
}

export function runOnJS<A extends any[], R>(
  fun: RunOnJSFunction<A, R>
): () => void {
  'worklet';
  if (!_WORKLET) {
    return fun;
  }
  if (!fun.__callAsync) {
    throw new Error(
      "Attempting to call runOnJS with an object that is not a host function. Using runOnJS is only possible with methods that are defined on the main React-Native Javascript thread and that aren't marked as worklets"
    );
  } else {
    return fun.__callAsync;
  }
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
