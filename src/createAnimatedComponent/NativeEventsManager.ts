'use strict';
import type {
  INativeEventsManager,
  IAnimatedComponentInternal,
  AnimatedComponentProps,
  InitialComponentProps,
} from './commonTypes';
import { has } from './utils';
import { WorkletEventHandler } from '../reanimated2/WorkletEventHandler';
import { isWeb } from '../reanimated2/PlatformChecker';

const IS_WEB = isWeb();

type ManagedAnimatedComponent = React.Component<
  AnimatedComponentProps<InitialComponentProps>
> &
  IAnimatedComponentInternal;

type WorkletEventHandlerProp = {
  workletEventHandler: InstanceType<typeof WorkletEventHandler>;
};

function isWorkletEventHandler(prop: unknown): prop is WorkletEventHandlerProp {
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

export class NativeEventsManager implements INativeEventsManager {
  _managedComponent: ManagedAnimatedComponent;

  constructor(component: ManagedAnimatedComponent) {
    this._managedComponent = component;
  }

  public attachNativeEvents(): void {
    if (IS_WEB) {
      return;
    }
    executeForEachEventHandler(this._managedComponent.props, (key, handler) => {
      handler.registerForEvents(this._managedComponent._eventViewTag, key);
    });
  }

  public detachNativeEvents(): void {
    if (IS_WEB) {
      return;
    }
    executeForEachEventHandler(
      this._managedComponent.props,
      (_key, handler) => {
        handler.unregisterFromEvents(this._managedComponent._eventViewTag);
      }
    );
  }

  public updateNativeEvents(
    prevProps: AnimatedComponentProps<InitialComponentProps>,
    computedEventTag: number
  ): void {
    if (IS_WEB) {
      return;
    }
    // If the event view tag changes, we need to completely re-mount all events
    if (this._managedComponent._eventViewTag !== computedEventTag) {
      // Remove all bindings from previous props that ran on the old viewTag
      executeForEachEventHandler(prevProps, (_key, handler) => {
        handler.unregisterFromEvents(this._managedComponent._eventViewTag);
      });
      // We don't need to unregister from current (new) props, because their events weren't registered yet
      // Replace the view tag
      this._managedComponent._eventViewTag = computedEventTag;
      // Attach the events with a new viewTag
      this.attachNativeEvents();
      return;
    }

    executeForEachEventHandler(prevProps, (key, prevHandler) => {
      const newProp = this._managedComponent.props[key];
      if (!newProp) {
        // Prop got deleted
        prevHandler.unregisterFromEvents(this._managedComponent._eventViewTag);
      } else if (
        isWorkletEventHandler(newProp) &&
        newProp.workletEventHandler !== prevHandler
      ) {
        // Prop got changed
        prevHandler.unregisterFromEvents(this._managedComponent._eventViewTag);
        newProp.workletEventHandler.registerForEvents(
          this._managedComponent._eventViewTag
        );
      }
    });

    executeForEachEventHandler(this._managedComponent.props, (key, handler) => {
      if (!prevProps[key]) {
        // Prop got added
        handler.registerForEvents(this._managedComponent._eventViewTag);
      }
    });
  }
}
