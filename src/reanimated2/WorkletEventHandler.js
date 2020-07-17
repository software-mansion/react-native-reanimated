import NativeModule from './NativeReanimated';

const jsListener = (eventName, handler) => (evt) => {
  handler({ ...evt.nativeEvent, eventName });
};

export default class WorkletEventHandler {
  constructor(worklet, eventNames = []) {
    this.worklet = worklet;
    this.eventNames = eventNames;

    if (!NativeModule.native) {
      this.listeners = eventNames.reduce((acc, eventName) => {
        acc[eventName] = jsListener(eventName, worklet);
        return acc;
      }, {});
    }
  }

  registerForEvents(viewTag, fallbackEventName = undefined) {
    this.registrations = this.eventNames.map((eventName) =>
      NativeModule.registerEventHandler(viewTag + eventName, this.worklet)
    );
    if (this.registrations.length === 0 && fallbackEventName) {
      this.registrations.push(
        NativeModule.registerEventHandler(
          viewTag + fallbackEventName,
          this.worklet
        )
      );
    }
  }

  unregisterFromEvents() {
    this.registrations &&
      this.registrations.forEach((id) =>
        NativeModule.unregisterEventHandler(id)
      );
    this.registrations = undefined;
  }
}
