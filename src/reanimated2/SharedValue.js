import NativeModule from './NativeReanimated';

export default class SharedValue {

  static idCounter = 0;

  constructor(value) {
    this.id = SharedValue.idCounter++;
    this.initialValue = value;
    NativeModule.registerSharedValue(this.id, value);
  }

  async get() {
    var _this = this
    return new Promise(function(resolve, reject) {
      NativeModule.getSharedValueAsync(_this.id, (value) => {
        // without setTimeout with timout 0 VM executes resolve before registering the Promise
        setTimeout(() => {
          resolve(value);
        }, 0)
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