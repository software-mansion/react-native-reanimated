import NativeModule from './NativeReanimated';

export default class Worklet {
    
  static idCounter = 0;
  
  constructor(func) {
    this.id = Worklet.idCounter++;
    this.func = func;
    NativeModule.registerWorklet(this.id, this); 
    return this;
  }

  start(sharedValues) {
    NativeModule.activateWorklet(thid.id, sharedValues);
  }

  release() {
    NativeModule.unregisterWorklet(this.id);
  }

}