'use strict';
import type React from 'react';
import type {
  IWorkletsModule,
  ShareableRef,
  WorkletFunction,
} from 'react-native-worklets';
import { executeOnUIRuntimeSync, WorkletsModule } from 'react-native-worklets';

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
import { ReanimatedError, registerReanimatedError } from '../errors';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { checkCppVersion } from '../platform-specific/checkCppVersion';
import { jsVersion } from '../platform-specific/jsVersion';
import { assertWorkletsVersion } from '../platform-specific/workletsVersion';
import { shouldBeUseWeb } from '../PlatformChecker';
import { ReanimatedTurboModule } from '../specs';
import type {
  IReanimatedModule,
  ReanimatedModuleProxy,
} from './reanimatedModuleProxy';

const IS_WEB = shouldBeUseWeb();

export function createNativeReanimatedModule(): IReanimatedModule {
  return new NativeReanimatedModule();
}

function assertSingleReanimatedInstance() {
  if (
    global._REANIMATED_VERSION_JS !== undefined &&
    global._REANIMATED_VERSION_JS !== jsVersion
  ) {
    throw new ReanimatedError(
      `Another instance of Reanimated was detected.
See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#another-instance-of-reanimated-was-detected\` for more details. Previous: ${global._REANIMATED_VERSION_JS}, current: ${jsVersion}.`
    );
  }
}

class NativeReanimatedModule implements IReanimatedModule {
  /**
   * We keep the instance of `WorkletsModule` here to keep correct coupling of
   * the modules and initialization order.
   */
  #workletsModule: IWorkletsModule;
  #reanimatedModuleProxy: ReanimatedModuleProxy;

  constructor() {
    this.#workletsModule = WorkletsModule;
    // These checks have to split since version checking depend on the execution order
    if (__DEV__) {
      assertSingleReanimatedInstance();
      assertWorkletsVersion();
    }
    global._REANIMATED_VERSION_JS = jsVersion;

    // TODO: remove this call once ReanimatedModule is migrated to TurboModuleWithJSIBindings
    ReanimatedTurboModule?.installTurboModule();
  
    if (ReanimatedTurboModule === null || global.__reanimatedModuleProxy === undefined) {
      throw new ReanimatedError(
        `Native part of Reanimated doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`
      );
    }
    if (!globalThis.RN$Bridgeless && !IS_WEB) {
      throw new ReanimatedError(
        'Reanimated 4 supports only the React Native New Architecture and web.'
      );
    }
    if (__DEV__) {
      checkCppVersion();
    }
    this.#reanimatedModuleProxy = global.__reanimatedModuleProxy;
    executeOnUIRuntimeSync(function initializeUI() {
      'worklet';
      registerReanimatedError();
    })();
  }

  registerSensor(
    sensorType: number,
    interval: number,
    iosReferenceFrame: number,
    handler: ShareableRef<(data: Value3D | ValueRotation) => void>
  ) {
    return this.#reanimatedModuleProxy.registerSensor(
      sensorType,
      interval,
      iosReferenceFrame,
      handler
    );
  }

  unregisterSensor(sensorId: number) {
    return this.#reanimatedModuleProxy.unregisterSensor(sensorId);
  }

  registerEventHandler<T>(
    eventHandler: ShareableRef<T>,
    eventName: string,
    emitterReactTag: number
  ) {
    return this.#reanimatedModuleProxy.registerEventHandler(
      eventHandler,
      eventName,
      emitterReactTag
    );
  }

  unregisterEventHandler(id: number) {
    return this.#reanimatedModuleProxy.unregisterEventHandler(id);
  }

  getViewProp<T>(
    viewTag: number,
    propName: string,
    component: React.Component | undefined, // required on Fabric
    callback?: (result: T) => void
  ) {
    const shadowNodeWrapper = getShadowNodeWrapperFromRef(
      component as React.Component
    );
    return this.#reanimatedModuleProxy.getViewProp(
      shadowNodeWrapper,
      propName,
      callback
    );
  }

  configureLayoutAnimationBatch(
    layoutAnimationsBatch: LayoutAnimationBatchItem[]
  ) {
    this.#reanimatedModuleProxy.configureLayoutAnimationBatch(
      layoutAnimationsBatch
    );
  }

  setShouldAnimateExitingForTag(viewTag: number, shouldAnimate: boolean) {
    this.#reanimatedModuleProxy.setShouldAnimateExitingForTag(
      viewTag,
      shouldAnimate
    );
  }

  enableLayoutAnimations(flag: boolean) {
    this.#reanimatedModuleProxy.enableLayoutAnimations(flag);
  }

  configureProps(uiProps: string[], nativeProps: string[]) {
    this.#reanimatedModuleProxy.configureProps(uiProps, nativeProps);
  }

  subscribeForKeyboardEvents(
    handler: ShareableRef<WorkletFunction>,
    isStatusBarTranslucent: boolean,
    isNavigationBarTranslucent: boolean
  ) {
    return this.#reanimatedModuleProxy.subscribeForKeyboardEvents(
      handler,
      isStatusBarTranslucent,
      isNavigationBarTranslucent
    );
  }

  unsubscribeFromKeyboardEvents(listenerId: number) {
    this.#reanimatedModuleProxy.unsubscribeFromKeyboardEvents(listenerId);
  }

  setViewStyle(viewTag: number, style: StyleProps) {
    this.#reanimatedModuleProxy.setViewStyle(viewTag, style);
  }

  markNodeAsRemovable(shadowNodeWrapper: ShadowNodeWrapper) {
    this.#reanimatedModuleProxy.markNodeAsRemovable(shadowNodeWrapper);
  }

  unmarkNodeAsRemovable(viewTag: number) {
    this.#reanimatedModuleProxy.unmarkNodeAsRemovable(viewTag);
  }

  registerCSSKeyframes(
    animationName: string,
    keyframesConfig: NormalizedCSSAnimationKeyframesConfig
  ) {
    this.#reanimatedModuleProxy.registerCSSKeyframes(
      animationName,
      keyframesConfig
    );
  }

  unregisterCSSKeyframes(animationName: string) {
    this.#reanimatedModuleProxy.unregisterCSSKeyframes(animationName);
  }

  applyCSSAnimations(
    shadowNodeWrapper: ShadowNodeWrapper,
    animationUpdates: CSSAnimationUpdates
  ) {
    this.#reanimatedModuleProxy.applyCSSAnimations(
      shadowNodeWrapper,
      animationUpdates
    );
  }

  unregisterCSSAnimations(viewTag: number) {
    this.#reanimatedModuleProxy.unregisterCSSAnimations(viewTag);
  }

  registerCSSTransition(
    shadowNodeWrapper: ShadowNodeWrapper,
    transitionConfig: NormalizedCSSTransitionConfig
  ) {
    this.#reanimatedModuleProxy.registerCSSTransition(
      shadowNodeWrapper,
      transitionConfig
    );
  }

  updateCSSTransition(
    viewTag: number,
    configUpdates: Partial<NormalizedCSSTransitionConfig>
  ) {
    this.#reanimatedModuleProxy.updateCSSTransition(viewTag, configUpdates);
  }

  unregisterCSSTransition(viewTag: number) {
    this.#reanimatedModuleProxy.unregisterCSSTransition(viewTag);
  }
}
