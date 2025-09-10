'use strict';

import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import { WorkletEventHandler } from "../WorkletEventHandler.js";
import { has } from "./utils.js";
export class NativeEventsManager {
  #managedComponent;
  #componentOptions;
  #eventViewTag = -1;
  constructor(component, options) {
    this.#managedComponent = component;
    this.#componentOptions = options;
    this.#eventViewTag = this.getEventViewTag();
  }
  attachEvents() {
    executeForEachEventHandler(this.#managedComponent.props, (key, handler) => {
      handler.registerForEvents(this.#eventViewTag, key);
    });
  }
  detachEvents() {
    executeForEachEventHandler(this.#managedComponent.props, (_key, handler) => {
      handler.unregisterFromEvents(this.#eventViewTag);
    });
  }
  updateEvents(prevProps) {
    const computedEventTag = this.getEventViewTag(true);
    // If the event view tag changes, we need to completely re-mount all events
    if (this.#eventViewTag !== computedEventTag) {
      // Remove all bindings from previous props that ran on the old viewTag
      executeForEachEventHandler(prevProps, (_key, handler) => {
        handler.unregisterFromEvents(this.#eventViewTag);
      });
      // We don't need to unregister from current (new) props, because their events weren't registered yet
      // Replace the view tag
      this.#eventViewTag = computedEventTag;
      // Attach the events with a new viewTag
      this.attachEvents();
      return;
    }
    executeForEachEventHandler(prevProps, (key, prevHandler) => {
      const newProp = this.#managedComponent.props[key];
      if (!newProp) {
        // Prop got deleted
        prevHandler.unregisterFromEvents(this.#eventViewTag);
      } else if (isWorkletEventHandler(newProp) && newProp.workletEventHandler !== prevHandler) {
        // Prop got changed
        prevHandler.unregisterFromEvents(this.#eventViewTag);
        newProp.workletEventHandler.registerForEvents(this.#eventViewTag);
      }
    });
    executeForEachEventHandler(this.#managedComponent.props, (key, handler) => {
      if (!prevProps[key]) {
        // Prop got added
        handler.registerForEvents(this.#eventViewTag);
      }
    });
  }
  getEventViewTag(componentUpdate = false) {
    // Get the tag for registering events - since the event emitting view can be nested inside the main component
    const componentAnimatedRef = this.#managedComponent._componentRef;
    if (componentAnimatedRef?.getScrollableNode) {
      /*
        In most cases, getScrollableNode() returns a view tag, and findNodeHandle is not required. 
        However, to cover more exotic list cases, we will continue to use findNodeHandle 
        for consistency. For numerical values, findNodeHandle should return the value immediately, 
        as documented here: https://github.com/facebook/react/blob/91061073d57783c061889ac6720ef1ab7f0c2149/packages/react-native-renderer/src/ReactNativePublicCompat.js#L113
      */
      const scrollableNode = componentAnimatedRef.getScrollableNode();
      if (typeof scrollableNode === 'number') {
        return scrollableNode;
      }
      return findNodeHandle(scrollableNode) ?? -1;
    }
    if (this.#componentOptions?.setNativeProps) {
      // This case ensures backward compatibility with components that
      // have their own setNativeProps method passed as an option.
      return findNodeHandle(this.#managedComponent) ?? -1;
    }
    if (!componentUpdate) {
      // On the first render of a component, we may already receive a resolved view tag.
      return this.#managedComponent.getComponentViewTag();
    }
    if (componentAnimatedRef?.__nativeTag) {
      return componentAnimatedRef.__nativeTag ?? -1;
    }
    /*
      When a component is updated, a child could potentially change and have a different 
      view tag. This can occur with a GestureDetector component.
    */
    return findNodeHandle(componentAnimatedRef) ?? -1;
  }
}
function isWorkletEventHandler(prop) {
  return has('workletEventHandler', prop) && prop.workletEventHandler instanceof WorkletEventHandler;
}
function executeForEachEventHandler(props, callback) {
  for (const key in props) {
    const prop = props[key];
    if (isWorkletEventHandler(prop)) {
      callback(key, prop.workletEventHandler);
    }
  }
}
//# sourceMappingURL=NativeEventsManager.js.map