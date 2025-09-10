import type { AnimatedKeyboardOptions, LayoutAnimationBatchItem, SensorConfig, SensorType, SharedValue, Value3D, ValueRotation, WrapperRef } from './commonTypes';
export { startMapper, stopMapper } from './mappers';
export { makeMutable } from './mutables';
/**
 * @deprecated Please use the exported variable `reanimatedVersion` instead.
 * @returns `false` in Reanimated 4, `true` in Reanimated 3, doesn't exist in
 *   Reanimated 2 or 1
 */
export declare const isReanimated3: () => boolean;
/**
 * @deprecated Please use the exported variable `reanimatedVersion` instead.
 * @returns `false` in Reanimated 4, `true` in Reanimated 3, doesn't exist in
 *   Reanimated 2 or 1
 */
export declare const isConfigured: () => boolean;
export declare function getViewProp<T>(viewTag: number, propName: string, component?: WrapperRef | null): Promise<T>;
export declare function registerEventHandler<T>(eventHandler: (event: T) => void, eventName: string, emitterReactTag?: number): number;
export declare function unregisterEventHandler(id: number): void;
export declare function subscribeForKeyboardEvents(eventHandler: (state: number, height: number) => void, options: AnimatedKeyboardOptions): number;
export declare function unsubscribeFromKeyboardEvents(listenerId: number): void;
export declare function registerSensor(sensorType: SensorType, config: SensorConfig, eventHandler: (data: Value3D | ValueRotation, orientationDegrees: number) => void): number;
export declare function initializeSensor(sensorType: SensorType, config: SensorConfig): SharedValue<Value3D | ValueRotation>;
export declare function unregisterSensor(sensorId: number): void;
/**
 * @deprecated This function no longer has any effect in Reanimated and will be
 *   removed in the future.
 */
export declare function enableLayoutAnimations(_flag: boolean, _isCallByUser?: boolean): void;
export declare function configureLayoutAnimationBatch(layoutAnimationsBatch: LayoutAnimationBatchItem[]): void;
export declare function setShouldAnimateExitingForTag(viewTag: number | HTMLElement, shouldAnimate: boolean): void;
//# sourceMappingURL=core.d.ts.map