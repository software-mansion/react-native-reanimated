import NativeModule from './NativeReanimated';

export default class Worklet {
    
  static idCounter = 0;
  
  static create(func) {
    this.id = this.idCounter++;
    this.func = func;
    NativeModule.registerWorklet(this.id, this);
    return this;
  }

  start(sharedValues) {
    NativeModule.activateWorklet(thid.id);
  }

  release() {
    NativeModule.unregisterWorklet(this.id);
  }

}