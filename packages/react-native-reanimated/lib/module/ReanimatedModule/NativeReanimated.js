'use strict';

import { executeOnUIRuntimeSync, WorkletsModule } from 'react-native-worklets';
import { ReanimatedError, registerReanimatedError } from "../errors.js";
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { checkCppVersion } from "../platform-specific/checkCppVersion.js";
import { jsVersion } from "../platform-specific/jsVersion.js";
import { assertWorkletsVersion } from "../platform-specific/workletsVersion.js";
import { shouldBeUseWeb } from "../PlatformChecker.js";
import { ReanimatedTurboModule } from "../specs/index.js";
const IS_WEB = shouldBeUseWeb();
export function createNativeReanimatedModule() {
  return new NativeReanimatedModule();
}
function assertSingleReanimatedInstance() {
  if (global._REANIMATED_VERSION_JS !== undefined && global._REANIMATED_VERSION_JS !== jsVersion) {
    throw new ReanimatedError(`Another instance of Reanimated was detected.
See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#another-instance-of-reanimated-was-detected\` for more details. Previous: ${global._REANIMATED_VERSION_JS}, current: ${jsVersion}.`);
  }
}
class NativeReanimatedModule {
  /**
   * We keep the instance of `WorkletsModule` here to keep correct coupling of
   * the modules and initialization order.
   */
  #workletsModule;
  #reanimatedModuleProxy;
  constructor() {
    this.#workletsModule = WorkletsModule;
    // These checks have to split since version checking depend on the execution order
    if (__DEV__) {
      assertSingleReanimatedInstance();
      assertWorkletsVersion();
    }
    global._REANIMATED_VERSION_JS = jsVersion;
    if (global.__reanimatedModuleProxy === undefined && ReanimatedTurboModule) {
      if (!ReanimatedTurboModule.installTurboModule()) {
        // This path means that React Native has failed on reload.
        // We don't want to throw any errors to not mislead the users
        // that the problem is related to Reanimated.
        // We install a DummyReanimatedModuleProxy instead.
        this.#reanimatedModuleProxy = new DummyReanimatedModuleProxy();
        return;
      }
    }
    if (global.__reanimatedModuleProxy === undefined) {
      throw new ReanimatedError(`Native part of Reanimated doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#native-part-of-reanimated-doesnt-seem-to-be-initialized for more details.`);
    }
    if (!globalThis.RN$Bridgeless && !IS_WEB) {
      throw new ReanimatedError('Reanimated 4 supports only the React Native New Architecture and web.');
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
  registerSensor(sensorType, interval, iosReferenceFrame, handler) {
    return this.#reanimatedModuleProxy.registerSensor(sensorType, interval, iosReferenceFrame, handler);
  }
  unregisterSensor(sensorId) {
    return this.#reanimatedModuleProxy.unregisterSensor(sensorId);
  }
  registerEventHandler(eventHandler, eventName, emitterReactTag) {
    return this.#reanimatedModuleProxy.registerEventHandler(eventHandler, eventName, emitterReactTag);
  }
  unregisterEventHandler(id) {
    return this.#reanimatedModuleProxy.unregisterEventHandler(id);
  }
  getViewProp(viewTag, propName, component,
  // required on Fabric
  callback) {
    const shadowNodeWrapper = getShadowNodeWrapperFromRef(component);
    return this.#reanimatedModuleProxy.getViewProp(shadowNodeWrapper, propName, callback);
  }
  configureLayoutAnimationBatch(layoutAnimationsBatch) {
    this.#reanimatedModuleProxy.configureLayoutAnimationBatch(layoutAnimationsBatch);
  }
  setShouldAnimateExitingForTag(viewTag, shouldAnimate) {
    this.#reanimatedModuleProxy.setShouldAnimateExitingForTag(viewTag, shouldAnimate);
  }
  enableLayoutAnimations(flag) {
    this.#reanimatedModuleProxy.enableLayoutAnimations(flag);
  }
  configureProps(uiProps, nativeProps) {
    this.#reanimatedModuleProxy.configureProps(uiProps, nativeProps);
  }
  subscribeForKeyboardEvents(handler, isStatusBarTranslucent, isNavigationBarTranslucent) {
    return this.#reanimatedModuleProxy.subscribeForKeyboardEvents(handler, isStatusBarTranslucent, isNavigationBarTranslucent);
  }
  unsubscribeFromKeyboardEvents(listenerId) {
    this.#reanimatedModuleProxy.unsubscribeFromKeyboardEvents(listenerId);
  }
  setViewStyle(viewTag, style) {
    this.#reanimatedModuleProxy.setViewStyle(viewTag, style);
  }
  markNodeAsRemovable(shadowNodeWrapper) {
    this.#reanimatedModuleProxy.markNodeAsRemovable(shadowNodeWrapper);
  }
  unmarkNodeAsRemovable(viewTag) {
    this.#reanimatedModuleProxy.unmarkNodeAsRemovable(viewTag);
  }
  registerCSSKeyframes(animationName, keyframesConfig) {
    this.#reanimatedModuleProxy.registerCSSKeyframes(animationName, keyframesConfig);
  }
  unregisterCSSKeyframes(animationName) {
    this.#reanimatedModuleProxy.unregisterCSSKeyframes(animationName);
  }
  applyCSSAnimations(shadowNodeWrapper, animationUpdates) {
    this.#reanimatedModuleProxy.applyCSSAnimations(shadowNodeWrapper, animationUpdates);
  }
  unregisterCSSAnimations(viewTag) {
    this.#reanimatedModuleProxy.unregisterCSSAnimations(viewTag);
  }
  registerCSSTransition(shadowNodeWrapper, transitionConfig) {
    this.#reanimatedModuleProxy.registerCSSTransition(shadowNodeWrapper, transitionConfig);
  }
  updateCSSTransition(viewTag, configUpdates) {
    this.#reanimatedModuleProxy.updateCSSTransition(viewTag, configUpdates);
  }
  unregisterCSSTransition(viewTag) {
    this.#reanimatedModuleProxy.unregisterCSSTransition(viewTag);
  }
}
class DummyReanimatedModuleProxy {
  configureLayoutAnimationBatch() {}
  setShouldAnimateExitingForTag() {}
  enableLayoutAnimations() {}
  configureProps() {}
  subscribeForKeyboardEvents() {
    return -1;
  }
  unsubscribeFromKeyboardEvents() {}
  setViewStyle() {}
  markNodeAsRemovable() {}
  unmarkNodeAsRemovable() {}
  registerCSSKeyframes() {}
  unregisterCSSKeyframes() {}
  applyCSSAnimations() {}
  registerCSSAnimations() {}
  updateCSSAnimations() {}
  unregisterCSSAnimations() {}
  registerCSSTransition() {}
  updateCSSTransition() {}
  unregisterCSSTransition() {}
  registerSensor() {
    return -1;
  }
  unregisterSensor() {}
  registerEventHandler() {
    return -1;
  }
  unregisterEventHandler() {}
  getViewProp() {
    return null;
  }
}
//# sourceMappingURL=NativeReanimated.js.map