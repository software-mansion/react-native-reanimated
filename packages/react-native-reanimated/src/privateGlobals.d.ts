/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
'use strict';

// This file works by accident - currently Builder Bob doesn't move `.d.ts` files to output types.
// If it ever breaks, we should address it so we'd not pollute the user's global namespace.

import type {
  MapperRegistry,
  MeasuredDimensions,
  ShadowNodeWrapper,
  StyleProps,
} from './commonTypes';
import type { FrameCallbackRegistryUI } from './frameCallback/FrameCallbackRegistryUI';
import type { AnimatedStyle } from './helperTypes';
import type { LayoutAnimationsManager } from './layoutReanimation/animationsManager';
import type { ProgressTransitionRegister } from './layoutReanimation/sharedTransitions';
import type { ReanimatedModuleProxy } from './ReanimatedModule';
import type { RNScreensTurboModuleType } from './screenTransition/commonTypes';
import type { SensorContainer } from './SensorContainer';
import type { UpdatePropsManager } from './UpdateProps';

declare global {
  var __DISALLOW_WORKLETS_IMPORT: boolean | undefined;
  var _REANIMATED_IS_REDUCED_MOTION: boolean | undefined;
  var _REANIMATED_VERSION_CPP: string | undefined;
  var _REANIMATED_VERSION_JS: string | undefined;
  var __reanimatedModuleProxy: ReanimatedModuleProxy | undefined;
  var _log: (value: unknown) => void;
  var _notifyAboutProgress: (
    tag: number,
    value: Record<string, unknown>,
    isSharedTransition: boolean
  ) => void;
  var _notifyAboutEnd: (tag: number, removeView: boolean) => void;
  var _setGestureState: (handlerTag: number, newState: number) => void;
  var _updatePropsPaper:
    | ((
        operations: {
          tag: number;
          name: string | null;
          // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
          updates: StyleProps | AnimatedStyle<any>;
        }[]
      ) => void)
    | undefined;
  var _updatePropsFabric:
    | ((
        operations: {
          shadowNodeWrapper: ShadowNodeWrapper;
          // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
          updates: StyleProps | AnimatedStyle<any>;
        }[]
      ) => void)
    | undefined;
  var _removeFromPropsRegistry: (viewTags: number[]) => void | undefined;
  var _measurePaper:
    | ((viewTag: number | null) => MeasuredDimensions)
    | undefined;
  var _measureFabric:
    | ((shadowNodeWrapper: ShadowNodeWrapper | null) => MeasuredDimensions)
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
  var _frameCallbackRegistry: FrameCallbackRegistryUI;
  var console: Console;
  var __mapperRegistry: MapperRegistry;
  var __sensorContainer: SensorContainer;
  var LayoutAnimationsManager: LayoutAnimationsManager;
  var UpdatePropsManager: UpdatePropsManager;
  var ProgressTransitionRegister: ProgressTransitionRegister;
  var updateJSProps: (viewTag: number, props: Record<string, unknown>) => void;
  var RNScreensTurboModule: RNScreensTurboModuleType | undefined;
  var _obtainPropPaper: (viewTag: number, propName: string) => string;
  var _obtainPropFabric: (
    shadowNodeWrapper: ShadowNodeWrapper,
    propName: string
  ) => string;
  var RN$Bridgeless: boolean | undefined;
  /**
   * @deprecated Internals of `react-native-worklets`, abstain from using in the
   *   future.
   */
  var _getAnimationTimestamp: () => number;
  /**
   * @deprecated Internals of `react-native-worklets`, abstain from using in the
   *   future.
   */
  var __flushAnimationFrame: (timestamp: number) => void;
  /**
   * @deprecated Internals of `react-native-worklets`, abstain from using in the
   *   future.
   */
  var __frameTimestamp: number | undefined;
  /**
   * @deprecated Internals of `react-native-worklets`, abstain from using in the
   *   future.
   */
  var _scheduleOnRuntime: (
    runtime: WorkletRuntime,
    worklet: ShareableRef<() => void>
  ) => void;
  /**
   * @deprecated Internals of `react-native-worklets`, abstain from using in the
   *   future.
   */
  var _scheduleHostFunctionOnJS: (fun: (...args: A) => R, args?: A) => void;
  /**
   * @deprecated Internals of `react-native-worklets`, abstain from using in the
   *   future.
   */
  var _makeShareableClone: <T>(
    value: T,
    nativeStateSource?: object
  ) => FlatShareableRef<T>;
}
