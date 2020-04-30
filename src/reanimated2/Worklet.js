import NativeModule from './NativeReanimated';

export default class Worklet {
    
  static idCounter = 0;
  static applierId = 0;
  
  constructor(func) {
    if (func.asString === undefined) {
      throw "invalid function passed as worklet, did you forget to use 'worklet'?"
    }
    this.id = Worklet.idCounter++;
    this.func = func;
    NativeModule.registerWorklet(this.id, this);
    return this;
  }

  apply(sharedValues) {
    const id = Worklet.applierId++;
    let sharedValueIds = [];
    for (let sv of sharedValues) {
      sharedValueIds.push(sv.id);
    }
    NativeModule.registerApplier(id, this.id, sharedValueIds);
    return () => {
      NativeModule.unregisterApplier(id);
    };
  }

  registerAsMapper(sharedValues) {
    const id = Worklet.applierId++;
    let sharedValueIds = [];
    for (let sv of sharedValues) {
      sharedValueIds.push(sv.id);
    }
    NativeModule.registerMapper(id, this.id, sharedValueIds);
    return () => {
      NativeModule.unregisterMapper(id);
    };
  }

  release() {
    NativeModule.unregisterWorklet(this.id);
  }

  setListener(listener) {
    this.listener = listener;
    NativeModule.setWorkletListener(this.id, this.listener);
  }

}