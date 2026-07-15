'use strict';

import type { SerializableRef, WorkletFunction } from 'react-native-worklets';

import type {
  InternalHostInstance,
  LayoutAnimationBatchItem,
  SettledUpdate,
  ShadowNodeWrapper,
  StyleProps,
  Value3D,
  ValueRotation,
} from '../commonTypes';
import type {
  CSSAnimationUpdates,
  CSSPseudoStyleConfig,
  CSSTransitionConfig,
  NormalizedCSSAnimationKeyframesConfig,
} from '../css/native';
// LayoutAnimationTrace start
import type { LayoutAnimationTraceStartOptions } from '../layoutReanimation/layoutAnimationTrace';
// LayoutAnimationTrace end

/** Type of `__reanimatedModuleProxy` injected with JSI. */
export interface ReanimatedModuleProxy {
  // LayoutAnimationTrace start
  /** @internal Development-only layout-animation diagnostics. */
  _startLayoutAnimationTrace?(options: LayoutAnimationTraceStartOptions): void;
  /** @internal Development-only layout-animation diagnostics. */
  _stopLayoutAnimationTrace?(): void;
  /** @internal Development-only layout-animation diagnostics. */
  _clearLayoutAnimationTrace?(): void;
  /** @internal Development-only layout-animation diagnostics. */
  _getLayoutAnimationTrace?(): string;
  /** @internal Development-only layout-animation diagnostics. */
  _isLayoutAnimationTraceActive?(): boolean;
  /** @internal Development-only layout-animation diagnostics. */
  _recordLayoutAnimationConfigurationQueued?(
    viewTag: number,
    type: number,
    configured: boolean,
    deferred: boolean
  ): void;
  /** @internal Development-only layout-animation test-bench event. */
  _recordLayoutAnimationTraceEvent?(
    event:
      | 'scenario-reset'
      | 'scenario-run'
      | 'scenario-interrupt'
      | 'scenario-cancel'
      | 'callback-invoked'
      | 'animation-settled',
    finished: boolean | null,
    callbackCount: number | null
  ): void;
  // LayoutAnimationTrace end

  registerEventHandler<T>(
    eventHandler: SerializableRef<T>,
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
    handler: SerializableRef<(data: Value3D | ValueRotation) => void>
  ): number;

  unregisterSensor(sensorId: number): void;

  getStaticFeatureFlag(name: string): boolean;

  setDynamicFeatureFlag(name: string, value: boolean): void;

  subscribeForKeyboardEvents(
    handler: SerializableRef<WorkletFunction>,
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
    compoundComponentName: string,
    keyframesConfig: NormalizedCSSAnimationKeyframesConfig
  ): void;

  unregisterCSSKeyframes(
    animationName: string,
    compoundComponentName: string
  ): void;

  applyCSSAnimations(
    shadowNodeWrapper: ShadowNodeWrapper,
    compoundComponentName: string,
    animationUpdates: CSSAnimationUpdates
  ): void;

  unregisterCSSAnimations(viewTag: number): void;

  runCSSTransition(
    shadowNodeWrapper: ShadowNodeWrapper,
    transitionConfig: CSSTransitionConfig
  ): void;

  unregisterCSSTransition(viewTag: number): void;

  getSettledUpdates(): SettledUpdate[];

  registerPseudoStyles(
    shadowNodeWrapper: ShadowNodeWrapper,
    config: CSSPseudoStyleConfig
  ): void;

  unregisterPseudoStyles(viewTag: number): void;
}

export interface IReanimatedModule extends Omit<
  ReanimatedModuleProxy,
  'getViewProp'
> {
  getViewProp<TValue>(
    viewTag: number,
    propName: string,
    component: InternalHostInstance | null,
    callback?: (result: TValue) => void
  ): Promise<TValue>;
}
