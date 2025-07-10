'use strict';

import type { ShareableRef, WorkletFunction } from 'react-native-worklets';

import type {
  LayoutAnimationBatchItem,
  ShadowNodeWrapper,
  StyleProps,
  Value3D,
  ValueRotation,
} from '../commonTypes';
import type {
  CSSAnimationUpdates,
  NormalizedCSSAnimationKeyframesConfig,
  NormalizedCSSTransitionConfig,
} from '../css/platform/native';

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

  registerSensor(
    sensorType: number,
    interval: number,
    iosReferenceFrame: number,
    handler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ): number;

  unregisterSensor(sensorId: number): void;

  setDynamicFeatureFlag(name: string, value: boolean): void;

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

  markNodeAsRemovable(shadowNodeWrapper: ShadowNodeWrapper): void;
  unmarkNodeAsRemovable(viewTag: number): void;

  registerCSSKeyframes(
    animationName: string,
    keyframesConfig: NormalizedCSSAnimationKeyframesConfig
  ): void;

  unregisterCSSKeyframes(animationName: string): void;

  applyCSSAnimations(
    shadowNodeWrapper: ShadowNodeWrapper,
    animationUpdates: CSSAnimationUpdates
  ): void;

  unregisterCSSAnimations(viewTag: number): void;

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

export interface IReanimatedModule
  extends Omit<ReanimatedModuleProxy, 'getViewProp'> {
  getViewProp<TValue>(
    viewTag: number,
    propName: string,
    component: React.Component | undefined,
    callback?: (result: TValue) => void
  ): Promise<TValue>;
}
