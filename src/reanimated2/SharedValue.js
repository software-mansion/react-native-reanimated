import NativeModule from './NativeReanimated';

export default class SharedValue {

  static idCounter = 0;

  constructor(value) {
    this.id = SharedValue.idCounter++;
    NativeModule.createSharedValue(this.id, value)
  }

  async get() {
    return NativeModule.getSharedValue(this.id);
  }

  set(newValue) {
    NativeModule.setSharedValue(this.id, newValue);
  }

  release() {
    NativeModule.destroySharedValue(this.id);
  }

}