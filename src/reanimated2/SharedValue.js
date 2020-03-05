import NativeModule from './NativeReanimated';

export default class SharedValue {

  static idCounter = 0;

  constructor(value) {
    this.id = SharedValue.idCounter++;
    this.initialValue = value;

    if (value.isWorklet) {
      const argsIds = [];
      for (let arg of value.args) {
        argsIds.push(arg.id);
      }
      this.initialValue = { 
        workletId: value.body.workletId, 
        isWorklet: true,
        argsIds,
      };
    }

    NativeModule.registerSharedValue(this.id, this.initialValue);
    this.callbacks = {}
  }

  async get() {
    const uid = Math.floor(Math.random()*1e9)
    var _this = this
    return new Promise(function(resolve, reject) {
      _this.callbacks[uid] = (value) => {
        // without setTimeout with timout 0 VM executes resolve before registering the Promise
        setTimeout(() => {
          delete _this.callbacks[uid]
          resolve(value);
        }, 0)
      }
      NativeModule.getSharedValueAsync(_this.id, _this.callbacks[uid]);
    });
  }

  set(newValue) {
    NativeModule.setSharedValue(this.id, newValue);
  }

  release() {
    NativeModule.unregisterSharedValue(this.id);
  }

}