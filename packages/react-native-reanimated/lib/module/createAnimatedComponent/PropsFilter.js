'use strict';

import { initialUpdaterRun } from "../animation/index.js";
import { isSharedValue } from "../isSharedValue.js";
import { isChromeDebugger } from "../PlatformChecker.js";
import { WorkletEventHandler } from "../WorkletEventHandler.js";
import { getInlineStyle, hasInlineStyles } from "./InlinePropManager.js";
import { flattenArray, has } from "./utils.js";
function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}
export class PropsFilter {
  _initialPropsMap = new Map();
  filterNonAnimatedProps(component) {
    const inputProps = component.props;
    const props = {};
    for (const key in inputProps) {
      const value = inputProps[key];
      if (key === 'style') {
        const styleProp = inputProps.style;
        const styles = flattenArray(styleProp ?? []);
        const processedStyle = styles.map(style => {
          if (style && style.viewDescriptors) {
            const handle = style;
            if (component._isFirstRender) {
              this._initialPropsMap.set(handle, {
                ...handle.initial.value,
                ...initialUpdaterRun(handle.initial.updater)
              });
            }
            return this._initialPropsMap.get(handle) ?? {};
          } else if (hasInlineStyles(style)) {
            return getInlineStyle(style, component._isFirstRender);
          } else {
            return style;
          }
        });
        // keep styles as they were passed by the user
        // it will help other libs to interpret styles correctly
        props[key] = processedStyle;
      } else if (key === 'animatedProps') {
        const animatedProp = inputProps.animatedProps;
        if (animatedProp.initial !== undefined) {
          Object.keys(animatedProp.initial.value).forEach(initialValueKey => {
            props[initialValueKey] = animatedProp.initial?.value[initialValueKey];
          });
        }
      } else if (has('workletEventHandler', value) && value.workletEventHandler instanceof WorkletEventHandler) {
        if (value.workletEventHandler.eventNames.length > 0) {
          value.workletEventHandler.eventNames.forEach(eventName => {
            props[eventName] = has('listeners', value.workletEventHandler) ? value.workletEventHandler.listeners[eventName] : dummyListener;
          });
        } else {
          props[key] = dummyListener;
        }
      } else if (isSharedValue(value)) {
        if (component._isFirstRender) {
          props[key] = value.value;
        }
      } else if (key !== 'onGestureHandlerStateChange' || !isChromeDebugger()) {
        props[key] = value;
      }
    }
    return props;
  }
}
//# sourceMappingURL=PropsFilter.js.map