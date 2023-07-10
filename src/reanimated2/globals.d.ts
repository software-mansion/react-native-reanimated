/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
import type {
  AnimatedStyle,
  StyleProps,
  MeasuredDimensions,
  MapperRegistry,
  ShareableRef,
  ShareableSyncDataHolderRef,
  ShadowNodeWrapper,
  ComplexWorkletFunction,
} from './commonTypes';
import type { FrameCallbackRegistryUI } from './frameCallback/FrameCallbackRegistryUI';
import type { NativeReanimated } from './NativeReanimated/NativeReanimated';
import type { SensorContainer } from './SensorContainer';
import type { LayoutAnimationsManager } from './layoutReanimation/animationsManager';
import type { UpdatePropsManager } from './UpdateProps';

declare global {
  var _WORKLET: boolean | undefined;
  var _IS_FABRIC: boolean | undefined;
  var _REANIMATED_VERSION_CPP: string | undefined;
  var _REANIMATED_VERSION_BABEL_PLUGIN: string | undefined;
  var __reanimatedModuleProxy: NativeReanimated | undefined;
  var evalWithSourceMap:
    | ((js: string, sourceURL: string, sourceMap: string) => any)
    | undefined;
  var evalWithSourceUrl: ((js: string, sourceURL: string) => any) | undefined;
  var _log: (s: string) => void;
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
  var _makeShareableClone: (value: any) => any;
  var _updateDataSynchronously: (
    dataHolder: ShareableSyncDataHolderRef<any>,
    data: ShareableRef<any>
  ) => void;
  var _scheduleOnJS: (
    fun: ComplexWorkletFunction<A, R>,
    args?: unknown[]
  ) => void;
  var _updatePropsPaper:
    | ((
        operations: {
          tag: number;
          name: string;
          updates: StyleProps | AnimatedStyle;
        }[]
      ) => void)
    | undefined;
  var _updatePropsFabric:
    | ((
        operations: {
          shadowNodeWrapper: ShadowNodeWrapper;
          updates: StyleProps | AnimatedStyle;
        }[]
      ) => void)
    | undefined;
  var _removeFromPropsRegistry: (viewTags: number[]) => void | undefined;
  var _measurePaper: ((viewTag: number) => MeasuredDimensions) | undefined;
  var _measureFabric:
    | ((shadowNodeWrapper: ShadowNodeWrapper) => MeasuredDimensions)
    | undefined;
  var _scrollToPaper:
    | ((viewTag: number, x: number, y: number, animated: boolean) => void)
    | undefined;
  var _dispatchCommandFabric:
    | ((
        shadowNodeWrapper: ShadowNodeWrapper,
        commandName: string,
        args: Array<unknown>
      ) => void)
    | undefined;
  var __ErrorUtils: {
    reportFatalError: (error: Error) => void;
  };
  var _frameCallbackRegistry: FrameCallbackRegistryUI;
  var console: Console;
  var __frameTimestamp: number | undefined;
  var __flushAnimationFrame: (timestamp: number) => void;
  var __workletsCache: Map<string, any>;
  var __handleCache: WeakMap<object, any>;
  var __callMicrotasks: () => void;
  var __mapperRegistry: MapperRegistry;
  var __sensorContainer: SensorContainer;
  var _maybeFlushUIUpdatesQueue: () => void;
  var LayoutAnimationsManager: LayoutAnimationsManager;
  var UpdatePropsManager: UpdatePropsManager;
}
