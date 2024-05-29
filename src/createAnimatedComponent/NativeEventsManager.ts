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
  private _managedComponent: ManagedAnimatedComponent;
  private _componentOptions?: ComponentOptions;
  private _eventViewTag = -1;

  constructor(component: ManagedAnimatedComponent, options?: ComponentOptions) {
    this._managedComponent = component;
    this._componentOptions = options;
    this._eventViewTag = this.getEventViewTag();
  }

  public attachEvents() {
    this.executeForEachEventHandler(
      this._managedComponent.props,
      (key, handler) => {
        handler.registerForEvents(this._eventViewTag, key);
      }
    );
  }

  public detachEvents() {
    this.executeForEachEventHandler(
      this._managedComponent.props,
      (_key, handler) => {
        handler.unregisterFromEvents(this._eventViewTag);
      }
    );
  }

  public updateEvents(
    prevProps: AnimatedComponentProps<InitialComponentProps>
  ) {
    const computedEventTag = this.getEventViewTag();
    // If the event view tag changes, we need to completely re-mount all events
    if (this._eventViewTag !== computedEventTag) {
      // Remove all bindings from previous props that ran on the old viewTag
      this.executeForEachEventHandler(prevProps, (_key, handler) => {
        handler.unregisterFromEvents(this._eventViewTag);
      });
      // We don't need to unregister from current (new) props, because their events weren't registered yet
      // Replace the view tag
      this._eventViewTag = computedEventTag;
      // Attach the events with a new viewTag
      this.attachEvents();
      return;
    }

    this.executeForEachEventHandler(prevProps, (key, prevHandler) => {
      const newProp = this._managedComponent.props[key];
      if (!newProp) {
        // Prop got deleted
        prevHandler.unregisterFromEvents(this._eventViewTag);
      } else if (
        this.isWorkletEventHandler(newProp) &&
        newProp.workletEventHandler !== prevHandler
      ) {
        // Prop got changed
        prevHandler.unregisterFromEvents(this._eventViewTag);
        newProp.workletEventHandler.registerForEvents(this._eventViewTag);
      }
    });

    this.executeForEachEventHandler(
      this._managedComponent.props,
      (key, handler) => {
        if (!prevProps[key]) {
          // Prop got added
          handler.registerForEvents(this._eventViewTag);
        }
      }
    );
  }

  private isWorkletEventHandler(
    prop: unknown
  ): prop is WorkletEventHandlerHolder {
    return (
      has('workletEventHandler', prop) &&
      prop.workletEventHandler instanceof WorkletEventHandler
    );
  }

  private executeForEachEventHandler(
    props: AnimatedComponentProps<InitialComponentProps>,
    callback: (
      key: string,
      handler: InstanceType<typeof WorkletEventHandler>
    ) => void
  ) {
    for (const key in props) {
      const prop = props[key];
      if (this.isWorkletEventHandler(prop)) {
        callback(key, prop.workletEventHandler);
      }
    }
  }

  private getEventViewTag() {
    // Get the tag for registering events - since the event emitting view can be nested inside the main component
    const componentAnimatedRef = this._managedComponent
      ._component as AnimatedComponentRef;
    let newTag: number;
    if (componentAnimatedRef.getScrollableNode) {
      const scrollableNode = componentAnimatedRef.getScrollableNode();
      newTag = findNodeHandle(scrollableNode) ?? -1;
    } else {
      newTag =
        findNodeHandle(
          this._componentOptions?.setNativeProps
            ? this._managedComponent
            : componentAnimatedRef
        ) ?? -1;
    }
    return newTag;
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
