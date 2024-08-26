'use strict';
import type {
  INativeEventsManager,
  IAnimatedComponentInternal,
  AnimatedComponentProps,
  InitialComponentProps,
  AnimatedComponentRef,
} from './commonTypes';
import { has } from './utils';
import { WorkletEventHandler } from '../WorkletEventHandler';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';

export class NativeEventsManager implements INativeEventsManager {
  readonly #managedComponent: ManagedAnimatedComponent;
  readonly #componentOptions?: ComponentOptions;
  #eventViewTag = -1;

  constructor(component: ManagedAnimatedComponent, options?: ComponentOptions) {
    this.#managedComponent = component;
    this.#componentOptions = options;
    this.#eventViewTag = this.getEventViewTag();
  }

  public attachEvents() {
    executeForEachEventHandler(this.#managedComponent.props, (key, handler) => {
      handler.registerForEvents(this.#eventViewTag, key);
    });
  }

  public detachEvents() {
    executeForEachEventHandler(
      this.#managedComponent.props,
      (_key, handler) => {
        handler.unregisterFromEvents(this.#eventViewTag);
      }
    );
  }

  public updateEvents(
    prevProps: AnimatedComponentProps<InitialComponentProps>
  ) {
    const computedEventTag = this.getEventViewTag();
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
      } else if (
        isWorkletEventHandler(newProp) &&
        newProp.workletEventHandler !== prevHandler
      ) {
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

  private getEventViewTag() {
    // Get the tag for registering events - since the event emitting view can be nested inside the main component
    const componentAnimatedRef = this.#managedComponent
      ._component as AnimatedComponentRef;
    let newTag: number;
    if (componentAnimatedRef.getScrollableNode) {
      const scrollableNode = componentAnimatedRef.getScrollableNode();
      newTag = findNodeHandle(scrollableNode) ?? -1;
    } else {
      newTag =
        findNodeHandle(
          this.#componentOptions?.setNativeProps
            ? this.#managedComponent
            : componentAnimatedRef
        ) ?? -1;
    }
    return newTag;
  }
}

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
