import NativeModule from './NativeReanimated';

export default class WorkletEventHandler {

  static id = 0;

  constructor(worklet, sharedValues) {
    this.worklet = worklet;
    let sharedValueIds = [];
    for (let sv of sharedValues) {
      sharedValueIds.push(sv.id);
    }
    this.sharedValueIds = sharedValueIds;
    this.id = WorkletEventHandler.id++;
  }

  registerForEvent(viewTag, eventName) {
    console.warn("register for ", viewTag+eventName);
    console.warn("workletID ", this.worklet.id);
    NativeModule.registerEventApplier(this.id, viewTag+eventName, this.worklet.id, this.sharedValueIds);
  }

  release() {
    NativeModule.unregisterEventApplier(this.id);
  }
}