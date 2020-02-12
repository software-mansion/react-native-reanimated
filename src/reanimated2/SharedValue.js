import NativeModule from './NativeReanimated';

export default class SharedValue {

  static idCounter = 0;

  constructor(value) {
    this.id = SharedValue.idCounter++;
    NativeModule.registerSharedValue(this.id, value);
  }

  async get() {
    return new Promise(function(resolve, reject) {
      NativeModule.getSharedValueAsync(this.id, (value) => {
        resolve(value);
      });
    });
  }

  set(newValue) {
    NativeModule.setSharedValue(this.id, newValue);
  }

  release() {
    NativeModule.unregisterSharedValue(this.id);
  }

}