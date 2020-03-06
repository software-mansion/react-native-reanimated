import NativeModule from './NativeReanimated';
import Worklet from './Worklet';

export default class WorkletEventHandler {

  constructor(worklet, sharedValues) {
    this.worklet = worklet;
    let sharedValueIds = [];
    for (let sv of sharedValues) {
      console.log("dodaje " + sv.id);
      sharedValueIds.push(sv.id);
    }
    this.sharedValueIds = sharedValueIds;
    this.id = Worklet.applierId++;
  }

  registerForEvent(viewTag, eventName) {
    console.log("wartosci " + this.sharedValueIds);
    NativeModule.registerEventApplier(this.id, viewTag+eventName, this.worklet.id, this.sharedValueIds);
  }

  unregisterFromEvent() {
    NativeModule.unregisterEventApplier(this.id);
  }
}