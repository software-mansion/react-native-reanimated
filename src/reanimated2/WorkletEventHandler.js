import NativeModule from './NativeReanimated';
import Worklet from './Worklet';

export default class WorkletEventHandler {

  constructor(worklet, sharedValues) {
    this.worklet = worklet;
    let sharedValueIds = [];
    for (let sv of sharedValues) {
      sharedValueIds.push(sv.id);
    }
    this.sharedValueIds = sharedValueIds;
    this.id = Worklet.applierId++;
  }

  registerForEvent(viewTag, eventName) {
    console.warn("register for ", viewTag+eventName);
    console.warn("workletID ", this.worklet.id);
    NativeModule.registerEventApplier(this.id, viewTag+eventName, this.worklet.id, this.sharedValueIds);
  }

  unregisterFromEvent() {
    NativeModule.unregisterEventApplier(this.id);
  }
}