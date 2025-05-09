/// <reference types="react" />
import type { AnimatedKeyboardOptions, LayoutAnimationBatchItem, SensorConfig, SensorType, SharedValue, Value3D, ValueRotation } from './commonTypes';
export { startMapper, stopMapper } from './mappers';
export { makeMutable } from './mutables';
export { createWorkletRuntime, executeOnUIRuntimeSync, makeShareable, makeShareableCloneRecursive, runOnJS, runOnRuntime, runOnUI, } from 'react-native-worklets';
/** @returns `true` in Reanimated 3, doesn't exist in Reanimated 2 or 1 */
export declare const isReanimated3: () => boolean;
/**
 * @deprecated This function was superseded by other checks. We keep it here for
 *   backward compatibility reasons. If you need to check if you are using
 *   Reanimated 3 or Reanimated 2 please use `isReanimated3` function instead.
 * @returns `true` in Reanimated 3, doesn't exist in Reanimated 2
 */
export declare const isConfigured: () => boolean;
export declare function getViewProp<T>(viewTag: number, propName: string, component?: React.Component): Promise<T>;
export declare function registerEventHandler<T>(eventHandler: (event: T) => void, eventName: string, emitterReactTag?: number): number;
export declare function unregisterEventHandler(id: number): void;
export declare function subscribeForKeyboardEvents(eventHandler: (state: number, height: number) => void, options: AnimatedKeyboardOptions): number;
export declare function unsubscribeFromKeyboardEvents(listenerId: number): void;
export declare function registerSensor(sensorType: SensorType, config: SensorConfig, eventHandler: (data: Value3D | ValueRotation, orientationDegrees: number) => void): number;
export declare function initializeSensor(sensorType: SensorType, config: SensorConfig): SharedValue<Value3D | ValueRotation>;
export declare function unregisterSensor(sensorId: number): void;
export declare function enableLayoutAnimations(flag: boolean, isCallByUser?: boolean): void;
export declare function configureLayoutAnimationBatch(layoutAnimationsBatch: LayoutAnimationBatchItem[]): void;
export declare function setShouldAnimateExitingForTag(viewTag: number | HTMLElement, shouldAnimate: boolean): void;
export declare function jsiConfigureProps(uiProps: string[], nativeProps: string[]): void;
//# sourceMappingURL=core.d.ts.map