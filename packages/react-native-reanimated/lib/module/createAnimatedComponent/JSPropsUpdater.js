'use strict';

import { runOnUI } from 'react-native-worklets';
import { SHOULD_BE_USE_WEB } from "../common/index.js";
class JSPropsUpdaterNative {
  static _tagToComponentMapping = new Map();
  registerComponent(animatedComponent, jsProps) {
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.set(viewTag, animatedComponent);
    runOnUI(() => {
      global._tagToJSPropNamesMapping[viewTag] = Object.fromEntries(jsProps.map(propName => [propName, true]));
    })();
  }
  unregisterComponent(animatedComponent) {
    const viewTag = animatedComponent.getComponentViewTag();
    JSPropsUpdaterNative._tagToComponentMapping.delete(viewTag);
    runOnUI(() => {
      delete global._tagToJSPropNamesMapping[viewTag];
    })();
  }
  updateProps(operations) {
    operations.forEach(({
      tag,
      updates
    }) => {
      const component = JSPropsUpdaterNative._tagToComponentMapping.get(tag);
      component?.setNativeProps(updates);
    });
  }
}
class JSPropsUpdaterWeb {
  registerComponent(_animatedComponent) {
    // noop
  }
  unregisterComponent(_animatedComponent) {
    // noop
  }
  updateProps(_operations) {
    // noop
  }
}
let JSPropsUpdater;
if (SHOULD_BE_USE_WEB) {
  JSPropsUpdater = JSPropsUpdaterWeb;
} else {
  JSPropsUpdater = JSPropsUpdaterNative;
}
const jsPropsUpdater = new JSPropsUpdater();
export default jsPropsUpdater;
//# sourceMappingURL=JSPropsUpdater.js.map