'use strict';

import type {
  ShareableRef,
  ShadowNodeWrapper,
  Value3D,
  ValueRotation,
  LayoutAnimationBatchItem,
  WorkletFunction,
  StyleProps,
} from '../commonTypes';
import type {
  NormalizedCSSTransitionConfig,
  NormalizedSingleCSSAnimationConfig,
  NormalizedSingleCSSAnimationSettings,
} from '../css';

/** Type of `__reanimatedModuleProxy` injected with JSI. */
export interface ReanimatedModuleProxy {
  registerEventHandler<T>(
    eventHandler: ShareableRef<T>,
    eventName: string,
    emitterReactTag: number
  ): number;

  unregisterEventHandler(id: number): void;

  getViewProp<T>(
    viewTagOrShadowNodeWrapper: number | ShadowNodeWrapper,
    propName: string,
    callback?: (result: T) => void
  ): Promise<T>;

  enableLayoutAnimations(flag: boolean): void;

  registerSensor(
    sensorType: number,
    interval: number,
    iosReferenceFrame: number,
    handler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ): number;

  unregisterSensor(sensorId: number): void;

  configureProps(uiProps: string[], nativeProps: string[]): void;

  subscribeForKeyboardEvents(
    handler: ShareableRef<WorkletFunction>,
    isStatusBarTranslucent: boolean,
    isNavigationBarTranslucent: boolean
  ): number;

  unsubscribeFromKeyboardEvents(listenerId: number): void;

  configureLayoutAnimationBatch(
    layoutAnimationsBatch: LayoutAnimationBatchItem[]
  ): void;

  setShouldAnimateExitingForTag(viewTag: number, shouldAnimate: boolean): void;

  setViewStyle(viewTag: number, style: StyleProps): void;

  removeViewStyle(viewTag: number): void;

  registerCSSAnimation(
    shadowNodeWrapper: ShadowNodeWrapper,
    animationId: number,
    animationConfig: NormalizedSingleCSSAnimationConfig
  ): void;

  updateCSSAnimation(
    animationId: number,
    updatedSettings: Partial<NormalizedSingleCSSAnimationSettings>
  ): void;

  unregisterCSSAnimations(animationIds: number[]): void;

  registerCSSTransition(
    shadowNodeWrapper: ShadowNodeWrapper,
    transitionConfig: NormalizedCSSTransitionConfig
  ): void;

  updateCSSTransition(
    viewTag: number,
    settingsUpdates: Partial<NormalizedCSSTransitionConfig>
  ): void;

  unregisterCSSTransition(viewTag: number): void;
}
