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
import type { SensorContainer } from './SensorContainer';
import type { LayoutAnimationsManager } from './layoutReanimation/animationsManager';

declare global {
  var _WORKLET: boolean | undefined;
  var _IS_FABRIC: boolean | undefined;
  var _REANIMATED_VERSION_CPP: string | undefined;
  var _REANIMATED_VERSION_BABEL_PLUGIN: string | undefined;
  var __reanimatedModuleProxy: NativeReanimated | undefined;
  var evalWithSourceMap:
    | ((
        js: string,
        sourceURL: string,
        sourceMap: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) => any)
    | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var _makeShareableClone: (value: any) => any;
  var _updateDataSynchronously: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataHolder: ShareableSyncDataHolderRef<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: ShareableRef<any>
  ) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var _scheduleOnJS: (fun: ShareableRef<any>, args?: ShareableRef<any>) => void;
  var _updatePropsPaper:
    | ((tag: number, name: string, updates: StyleProps | AnimatedStyle) => void)
    | undefined;
  var _updatePropsFabric:
    | ((
        shadowNodeWrapper: ShadowNodeWrapper,
        props: StyleProps | AnimatedStyle
      ) => void)
    | undefined;
  var _removeShadowNodeFromRegistry: ((viewTag: number) => void) | undefined;
  var _measure: (viewTag: number | ShadowNodeWrapper) => MeasuredDimensions;
  var _scrollTo: (
    viewTag: number,
    x: number,
    y: number,
    animated: boolean
  ) => void;
  var _dispatchCommand:
    | ((
        nodeRef: ShadowNodeWrapper,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __workletsCache: Map<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __handleCache: WeakMap<object, any>;
  var __callMicrotasks: () => void;
  var __mapperRegistry: MapperRegistry;
  var __sensorContainer: SensorContainer;
  var _maybeFlushUIUpdatesQueue: () => void;
  var LayoutAnimationsManager: LayoutAnimationsManager;
}
