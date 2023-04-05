/* eslint-disable no-var */
import type {
  AnimatedStyle,
  StyleProps,
  MeasuredDimensions,
  MapperRegistry,
  ShareableRef,
  ShareableSyncDataHolderRef,
  ShadowNodeWrapper,
} from './commonTypes';
import type { FrameCallbackRegistryUI } from './frameCallback/FrameCallbackRegistryUI';
import type { NativeReanimated } from './NativeReanimated/NativeReanimated';
import type {
  LayoutAnimationFunction,
  LayoutAnimationType,
  LayoutAnimationsValues,
} from './layoutReanimation/animationBuilder';

declare global {
  var _WORKLET: boolean;
  var _IS_FABRIC: boolean;
  var _REANIMATED_VERSION_CPP: string;
  var _REANIMATED_VERSION_BABEL_PLUGIN: string;
  var __reanimatedModuleProxy: NativeReanimated;
  var evalWithSourceMap: (
    js: string,
    sourceURL: string,
    sourceMap: string
    // eslint-ignore-next-line @typescript-eslint/no-explicit-any
  ) => any;
  // eslint-ignore-next-line @typescript-eslint/no-explicit-any
  var evalWithSourceUrl: (js: string, sourceURL: string) => any;
  var _log: (s: string) => void;
  var _getCurrentTime: () => number;
  var _notifyAboutProgress: (
    tag: number,
    value: number,
    isSharedTransition: boolean
  ) => void;
  var _notifyAboutEnd: (
    tag: number,
    finished: boolean,
    removeView: boolean
  ) => void;
  var _setGestureState: (handlerTag: number, newState: number) => void;
  // eslint-ignore-next-line @typescript-eslint/no-explicit-any
  var _makeShareableClone: (value: any) => any;
  var _updateDataSynchronously: (
    dataHolder: ShareableSyncDataHolderRef,
    data: ShareableRef
  ) => void;
  var _scheduleOnJS: (fun: ShareableRef, args?: ShareableRef) => void;
  var _updatePropsPaper: (
    tag: number,
    name: string,
    updates: StyleProps | AnimatedStyle
  ) => void;
  var _updatePropsFabric: (
    shadowNodeWrapper: ShadowNodeWrapper,
    props: StyleProps | AnimatedStyle
  ) => void;
  var _removeShadowNodeFromRegistry: (viewTag: number) => void;
  var _measure: (viewTag: number) => MeasuredDimensions;
  var _scrollTo: (
    viewTag: number,
    x: number,
    y: number,
    animated: boolean
  ) => void;
  var _dispatchCommand: (
    nodeRef: ShadowNodeWrapper | number,
    commandName: string,
    args: Array<unknown>
  ) => void;
  var performance: { now: () => number };
  var ReanimatedDataMock: {
    now: () => number;
  };
  var __ErrorUtils: {
    reportFatalError: (error: Error) => void;
  };
  var _frameCallbackRegistry: FrameCallbackRegistryUI;
  var requestAnimationFrame: (callback: (time: number) => void) => number;
  var console: Console;
  var __frameTimestamp: number | undefined;
  var __flushAnimationFrame: (timestamp: number) => void;
  // eslint-ignore-next-line @typescript-eslint/no-explicit-any
  var __workletsCache: Map<string, any>;
  // eslint-ignore-next-line @typescript-eslint/no-explicit-any
  var __handleCache: WeakMap<object, any>;
  var __callMicrotasks: () => void;
  var __mapperRegistry: MapperRegistry;
  var LayoutAnimationsManager: {
    start(
      tag: number,
      type: LayoutAnimationType,
      yogaValues: LayoutAnimationsValues,
      config: LayoutAnimationFunction
    );
  };
}
