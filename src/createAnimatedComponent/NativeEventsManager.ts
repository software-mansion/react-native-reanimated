'use strict';
import type {
  INativeEventsManager,
  IAnimatedComponentInternal,
  AnimatedComponentProps,
  InitialComponentProps,
  AnimatedComponentRef,
} from './commonTypes';
import { has } from './utils';
import { WorkletEventHandler } from '../reanimated2/WorkletEventHandler';
import { findNodeHandle } from 'react-native';

export class NativeEventsManager implements INativeEventsManager {
  _managedComponent: ManagedAnimatedComponent;
  _componentOptions?: ComponentOptions;
  _eventViewTag = -1;

  constructor(component: ManagedAnimatedComponent, options?: ComponentOptions) {
    this._managedComponent = component;
    this._componentOptions = options;
    this._eventViewTag = getEventViewTag(
      this._managedComponent,
      this._componentOptions
    );
  }

  public attachNativeEvents() {
    executeForEachEventHandler(this._managedComponent.props, (key, handler) => {
      handler.registerForEvents(this._eventViewTag, key);
    });
  }

  public detachNativeEvents() {
    executeForEachEventHandler(
      this._managedComponent.props,
      (_key, handler) => {
        handler.unregisterFromEvents(this._eventViewTag);
      }
    );
  }

  public updateNativeEvents(
    prevProps: AnimatedComponentProps<InitialComponentProps>
  ) {
    const computedEventTag = getEventViewTag(
      this._managedComponent,
      this._componentOptions
    );
    // If the event view tag changes, we need to completely re-mount all events
    if (this._eventViewTag !== computedEventTag) {
      // Remove all bindings from previous props that ran on the old viewTag
      executeForEachEventHandler(prevProps, (_key, handler) => {
        handler.unregisterFromEvents(this._eventViewTag);
      });
      // We don't need to unregister from current (new) props, because their events weren't registered yet
      // Replace the view tag
      this._eventViewTag = computedEventTag;
      // Attach the events with a new viewTag
      this.attachNativeEvents();
      return;
    }

    executeForEachEventHandler(prevProps, (key, prevHandler) => {
      const newProp = this._managedComponent.props[key];
      if (!newProp) {
        // Prop got deleted
        prevHandler.unregisterFromEvents(this._eventViewTag);
      } else if (
        isWorkletEventHandler(newProp) &&
        newProp.workletEventHandler !== prevHandler
      ) {
        // Prop got changed
        prevHandler.unregisterFromEvents(this._eventViewTag);
        newProp.workletEventHandler.registerForEvents(this._eventViewTag);
      }
    });

    executeForEachEventHandler(this._managedComponent.props, (key, handler) => {
      if (!prevProps[key]) {
        // Prop got added
        handler.registerForEvents(this._eventViewTag);
      }
    });
  }
}

type ManagedAnimatedComponent = React.Component<
  AnimatedComponentProps<InitialComponentProps>
> &
  IAnimatedComponentInternal;

type ComponentOptions = {
  setNativeProps: (
    ref: AnimatedComponentRef,
    props: InitialComponentProps
  ) => void;
};

type WorkletEventHandlerHolder = {
  workletEventHandler: InstanceType<typeof WorkletEventHandler>;
};

function isWorkletEventHandler(
  prop: unknown
): prop is WorkletEventHandlerHolder {
  return (
    has('workletEventHandler', prop) &&
    prop.workletEventHandler instanceof WorkletEventHandler
  );
}

function executeForEachEventHandler(
  props: AnimatedComponentProps<InitialComponentProps>,
  callback: (
    key: string,
    handler: InstanceType<typeof WorkletEventHandler>
  ) => void
) {
  for (const key in props) {
    const prop = props[key];
    if (isWorkletEventHandler(prop)) {
      callback(key, prop.workletEventHandler);
    }
  }
}

function getEventViewTag(
  component: ManagedAnimatedComponent,
  options?: ComponentOptions
) {
  // Get the tag for registering events - since the event emitting view can be nested inside the main component
  const componentAnimatedRef = component._component as AnimatedComponentRef;
  let newTag: number;
  if (componentAnimatedRef.getScrollableNode) {
    const scrollableNode = componentAnimatedRef.getScrollableNode();
    newTag = findNodeHandle(scrollableNode) ?? -1;
  } else {
    newTag =
      findNodeHandle(
        options?.setNativeProps ? component : componentAnimatedRef
      ) ?? -1;
  }
  return newTag;
}
