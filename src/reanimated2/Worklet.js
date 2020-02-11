import NativeModule from './NativeReanimated';

export default class Worklet {
    
  static idCounter = 0;
  
  static create(func) {
    this.id = this.idCounter++;
    this.func = func;
    global[this.id.toString()] = func;
    NativeModule.registerWorklet(this.id, this.id.toString());
    return this;
  }

  start(sharedValues) {
    NativeModule.activateWorklet(thid.id, sharedValues);
  }

  release() {
    NativeModule.unregisterWorklet(this.id, sharedValues);
  }

}