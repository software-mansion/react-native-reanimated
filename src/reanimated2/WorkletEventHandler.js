import { NativeReanimated } from './platform-specific/PlatformSpecific';

const jsListener = (eventName, handler) => (evt) => {
  handler({ ...evt.nativeEvent, eventName });
};

export default class WorkletEventHandler {
  constructor(worklet, eventNames = []) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.reattachNeeded = false;

    if (!NativeReanimated.native) {
      this.listeners = eventNames.reduce((acc, eventName) => {
        acc[eventName] = jsListener(eventName, worklet);
        return acc;
      }, {});
    }
  }

  updateWorklet(newWorklet) {
    this.worklet = newWorklet;
    this.reattachNeeded = true;
  }

  registerForEvents(viewTag, fallbackEventName = undefined) {
    this.viewTag = viewTag;
    this.registrations = this.eventNames.map((eventName) =>
      NativeReanimated.registerEventHandler(viewTag + eventName, this.worklet)
    );
    if (this.registrations.length === 0 && fallbackEventName) {
      this.registrations.push(
        NativeReanimated.registerEventHandler(
          viewTag + fallbackEventName,
          this.worklet
        )
      );
    }
  }

  unregisterFromEvents() {
    this.registrations &&
      this.registrations.forEach((id) =>
        NativeReanimated.unregisterEventHandler(id)
      );
    this.registrations = undefined;
  }
}
