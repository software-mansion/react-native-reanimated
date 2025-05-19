'use strict';

import { runOnJS, runOnUI } from 'react-native-worklets';
import { shouldBeUseWeb } from "../PlatformChecker.js";
const SHOULD_BE_USE_WEB = shouldBeUseWeb();
class JSPropsUpdaterNative {
  static _tagToComponentMapping = new Map();
  static isInitialized = false;
  constructor() {
    if (!JSPropsUpdaterNative.isInitialized) {
      const updater = (viewTag, props) => {
        const component = JSPropsUpdaterNative._tagToComponentMapping.get(viewTag);
        component?._updateFromNative(props);
      };
      runOnUI(() => {
        'worklet';

        global.updateJSProps = (viewTag, props) => {
          runOnJS(updater)(viewTag, props);
        };
      })();
      JSPropsUpdaterNative.isInitialized = true;
    }
  }
  addOnJSPropsChangeListener(animatedComponent) {
    if (!JSPropsUpdaterNative.isInitialized) {
      return;
    }
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.set(viewTag, animatedComponent);
  }
  removeOnJSPropsChangeListener(animatedComponent) {
    if (!JSPropsUpdaterNative.isInitialized) {
      return;
    }
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.delete(viewTag);
  }
}
class JSPropsUpdaterWeb {
  addOnJSPropsChangeListener(_animatedComponent) {
    // noop
  }
  removeOnJSPropsChangeListener(_animatedComponent) {
    // noop
  }
}
let JSPropsUpdater;
if (SHOULD_BE_USE_WEB) {
  JSPropsUpdater = JSPropsUpdaterWeb;
} else {
  JSPropsUpdater = JSPropsUpdaterNative;
}
export default JSPropsUpdater;
//# sourceMappingURL=JSPropsUpdater.js.map