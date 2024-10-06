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
  NormalizedCSSAnimationConfig,
  NormalizedCSSAnimationSettings,
  NormalizedCSSTransitionConfig,
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
    animationConfig: NormalizedCSSAnimationConfig
  ): void;

  updateCSSAnimation(
    animationId: number,
    settingsUpdates: Partial<NormalizedCSSAnimationSettings>
  ): void;

  unregisterCSSAnimation(animationId: number): void;

  registerCSSTransition(
    shadowNodeWrapper: ShadowNodeWrapper,
    transitionId: number,
    transitionConfig: NormalizedCSSTransitionConfig
  ): void;

  updateCSSTransition(
    transitionId: number,
    configUpdates: Partial<NormalizedCSSTransitionConfig>
  ): void;

  unregisterCSSTransition(transitionId: number): void;
}
