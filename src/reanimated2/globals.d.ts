/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
import type {
  StyleProps,
  MeasuredDimensions,
  MapperRegistry,
  ShareableRef,
  ShareableSyncDataHolderRef,
  ShadowNodeWrapper,
  __ComplexWorkletFunction,
  FlatShareableRef,
} from './commonTypes';
import type { AnimatedStyle } from './helperTypes';
import type { FrameCallbackRegistryUI } from './frameCallback/FrameCallbackRegistryUI';
import type { NativeReanimatedModule } from './NativeReanimated/NativeReanimated';
import type { SensorContainer } from './SensorContainer';
import type { LayoutAnimationsManager } from './layoutReanimation/animationsManager';
import type { ProgressTransitionRegister } from './layoutReanimation/sharedTransitions';
import type { UpdatePropsManager } from './UpdateProps';
import type { callGuardDEV } from './initializers';

declare global {
  var _REANIMATED_IS_REDUCED_MOTION: boolean | undefined;
  var _IS_FABRIC: boolean | undefined;
  var _REANIMATED_VERSION_CPP: string | undefined;
  var _REANIMATED_VERSION_JS: string | undefined;
  var _REANIMATED_VERSION_BABEL_PLUGIN: string | undefined;
  var __reanimatedModuleProxy: NativeReanimatedModule | undefined;
  var __callGuardDEV: typeof callGuardDEV | undefined;
  var evalWithSourceMap:
    | ((js: string, sourceURL: string, sourceMap: string) => any)
    | undefined;
  var evalWithSourceUrl: ((js: string, sourceURL: string) => any) | undefined;
  var _log: (s: string) => void;
  var _toString: (value: unknown) => string;
  var _notifyAboutProgress: (
    tag: number,
    value: Record<string, unknown>,
    isSharedTransition: boolean
  ) => void;
  var _notifyAboutEnd: (tag: number, removeView: boolean) => void;
  var _setGestureState: (handlerTag: number, newState: number) => void;
  var _makeShareableClone: <T>(value: T) => FlatShareableRef<T>;
  var _updateDataSynchronously: (
    dataHolder: ShareableSyncDataHolderRef<any>,
    data: ShareableRef<any>
  ) => void;
  var _scheduleOnJS: (
    fun: __ComplexWorkletFunction<A, R>,
    args?: unknown[]
  ) => void;
  var _updatePropsPaper:
    | ((
        operations: {
          tag: number;
          name: string;
          updates: StyleProps | AnimatedStyle<any>;
        }[]
      ) => void)
    | undefined;
  var _updatePropsFabric:
    | ((
        operations: {
          shadowNodeWrapper: ShadowNodeWrapper;
          updates: StyleProps | AnimatedStyle<any>;
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
  var _dispatchCommandPaper:
    | ((viewTag: number, commandName: string, args: Array<unknown>) => void)
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
  var ProgressTransitionRegister: ProgressTransitionRegister;
}
