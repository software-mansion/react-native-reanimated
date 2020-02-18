import NativeModule from './NativeReanimated';

export default class WorkletEventHandler {

  static id = 0;

  constructor(worklet, [sharedValues]) {
    this.worklet = worklet;
    this.sharedValues = sharedValues;
    this.id = WorkletEventHandler.id++;
  }

  registerForEvent(viewTag, eventName) {
    NativeModule.registerEventApplier(this.id, viewTag+eventName, this.worklet.id, this.sharedValues);
  }

  unregisterFromEvent() {
    NativeModule.unregisterEventApplier(this.id);
  }
}