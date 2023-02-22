import type {
  AnimatedStyle,
  StyleProps,
  MeasuredDimensions,
  MapperRegistry,
  ShareableRef,
  ShareableSyncDataHolderRef,
} from './commonTypes';
import type { FrameCallbackRegistryUI } from './frameCallback/FrameCallbackRegistryUI';
import type { ShadowNodeWrapper } from './hook/commonTypes';
import { LayoutAnimationStartFunction } from './layoutReanimation';
import type { NativeReanimated } from './NativeReanimated/NativeReanimated';

declare global {
  const _WORKLET: boolean;
  const _IS_FABRIC: boolean;
  const _REANIMATED_VERSION_CPP: string;
  const __reanimatedModuleProxy: NativeReanimated;
  const evalWithSourceMap: (
    js: string,
    sourceURL: string,
    sourceMap: string
  ) => any;
  const evalWithSourceUrl: (js: string, sourceURL: string) => any;
  const _log: (s: string) => void;
  const _getCurrentTime: () => number;
  const _notifyAboutProgress: (
    tag: number,
    value: number,
    isSharedTransition: boolean
  ) => void;
  const _notifyAboutEnd: (
    tag: number,
    finished: boolean,
    removeView: boolean
  ) => void;
  const _setGestureState: (handlerTag: number, newState: number) => void;
  const _makeShareableClone: (value: any) => any;
  const _updateDataSynchronously: (
    dataHolder: ShareableSyncDataHolderRef,
    data: ShareableRef
  ) => void;
  const _scheduleOnJS: (fun: ShareableRef, args?: ShareableRef) => void;
  const _updatePropsPaper: (
    tag: number,
    name: string,
    updates: StyleProps | AnimatedStyle
  ) => void;
  const _updatePropsFabric: (
    shadowNodeWrapper: ShadowNodeWrapper,
    props: StyleProps | AnimatedStyle
  ) => void;
  const _removeShadowNodeFromRegistry: (viewTag: number) => void;
  const _measure: (viewTag: number) => MeasuredDimensions;
  const _scrollTo: (
    viewTag: number,
    x: number,
    y: number,
    animated: boolean
  ) => void;
  const _dispatchCommand: (
    shadowNodeWrapper: ShadowNodeWrapper,
    commandName: string,
    args: Array<unknown>
  ) => void;
  const performance: { now: () => number };
  const ReanimatedDataMock: {
    now: () => number;
  };
  const ErrorUtils: {
    reportFatalError: (error: Error) => void;
  };
  const _frameCallbackRegistry: FrameCallbackRegistryUI;
  const requestAnimationFrame: (callback: (time: number) => void) => number;
  const setImmediate: (callback: (time: number) => void) => number;
  const console: Console;

  namespace NodeJS {
    interface Global {
      _WORKLET: boolean;
      _IS_FABRIC: boolean;
      _REANIMATED_VERSION_CPP: string;
      __reanimatedModuleProxy: NativeReanimated;
      __frameTimestamp?: number;
      evalWithSourceMap: (
        js: string,
        sourceURL: string,
        sourceMap: string
      ) => any;
      evalWithSourceUrl: (js: string, sourceURL: string) => any;
      _log: (s: string) => void;
      _getCurrentTime: () => number;
      _setGestureState: (handlerTag: number, newState: number) => void;
      _makeShareableClone: (value: any) => any;
      _updateDataSynchronously: (
        ShareableSyncDataHolderRef,
        ShareableRef
      ) => void;
      _scheduleOnJS: (fun: ShareableRef, args?: ShareableRef) => void;
      _updatePropsPaper: (
        tag: number,
        name: string,
        updates: StyleProps | AnimatedStyle
      ) => void;
      _updatePropsFabric: (
        shadowNodeWrapper: ShadowNodeWrapper,
        props: StyleProps | AnimatedStyle
      ) => void;
      _removeShadowNodeFromRegistry: (viewTag: number) => void;
      _measure: (viewTag: number) => MeasuredDimensions;
      _scrollTo: (
        viewTag: number,
        x: number,
        y: number,
        animated: boolean
      ) => void;
      _dispatchCommand: (
        shadowNodeWrapper: ShadowNodeWrapper,
        commandName: string,
        args: Array<unknown>
      ) => void;
      performance: { now: () => number };
      LayoutAnimationsManager: {
        start: LayoutAnimationStartFunction;
      };
      ReanimatedDataMock: {
        now: () => number;
      };
      ErrorUtils: {
        reportFatalError: (error: Error) => void;
      };
      _frameCallbackRegistry: FrameCallbackRegistryUI;
      __workletsCache?: Map<string, (...args: any[]) => any>;
      __handleCache?: WeakMap<any, any>;
      __mapperRegistry?: MapperRegistry;
      __flushImmediates: () => void;
      __flushAnimationFrame: (frameTimestamp: number) => void;
      requestAnimationFrame: (callback: (time: number) => void) => number;
      setImmediate: (callback: (time: number) => void) => number;
      console: Console;
    }
  }
}
