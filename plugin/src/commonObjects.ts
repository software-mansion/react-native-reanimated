<<<<<<< HEAD
/**
 * holds a map of function names as keys and array of argument indexes as values which should be automatically workletized(they have to be functions)(starting from 0)
 */
const functionArgsToWorkletize = new Map([
  ['useFrameCallback', [0]],
  ['useAnimatedStyle', [0]],
  ['useAnimatedProps', [0]],
  ['createAnimatedPropAdapter', [0]],
  ['useDerivedValue', [0]],
  ['useAnimatedScrollHandler', [0]],
  ['useAnimatedReaction', [0, 1]],
  ['useWorkletCallback', [0]],
  // animations' callbacks
  ['withTiming', [2]],
  ['withSpring', [2]],
  ['withDecay', [1]],
  ['withRepeat', [3]],
]);

const objectHooks = new Set([
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
]);

const globals = new Set([
=======
export const globals = new Set([
>>>>>>> origin/main
  'this',
  'console',
  'performance',
  'Date',
  'Array',
  'ArrayBuffer',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'HermesInternal',
  'JSON',
  'Math',
  'Number',
  'Object',
  'String',
  'Symbol',
  'undefined',
  'null',
  'UIManager',
  'requestAnimationFrame',
  'setImmediate',
<<<<<<< HEAD
=======
  'queueMicrotask',
>>>>>>> origin/main
  '_WORKLET',
  'arguments',
  'Boolean',
  'parseInt',
  'parseFloat',
  'Map',
  'WeakMap',
  'WeakRef',
  'Set',
  '_log',
  '_scheduleOnJS',
  '_makeShareableClone',
  '_updateDataSynchronously',
  'eval',
  '_updatePropsPaper',
  '_updatePropsFabric',
  '_removeShadowNodeFromRegistry',
  'RegExp',
  'Error',
  'ErrorUtils',
  'global',
  '_measure',
  '_scrollTo',
  '_dispatchCommand',
  '_setGestureState',
  '_getCurrentTime',
  'isNaN',
  'LayoutAnimationRepository',
  '_notifyAboutProgress',
  '_notifyAboutEnd',
]);
<<<<<<< HEAD

const gestureHandlerGestureObjects = new Set([
  // from https://github.com/software-mansion/react-native-gesture-handler/blob/new-api/src/handlers/gestures/gestureObjects.ts
  'Tap',
  'Pan',
  'Pinch',
  'Rotation',
  'Fling',
  'LongPress',
  'ForceTouch',
  'Native',
  'Manual',
  'Race',
  'Simultaneous',
  'Exclusive',
]);

const gestureHandlerBuilderMethods = new Set([
  'onBegin',
  'onStart',
  'onEnd',
  'onFinalize',
  'onUpdate',
  'onChange',
  'onTouchesDown',
  'onTouchesMove',
  'onTouchesUp',
  'onTouchesCancelled',
]);

export {
  functionArgsToWorkletize,
  objectHooks,
  globals,
  gestureHandlerGestureObjects,
  gestureHandlerBuilderMethods,
};
=======
>>>>>>> origin/main
