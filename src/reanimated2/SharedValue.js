import NativeModule from './NativeReanimated';
import Worklet from './Worklet';
import AnimatedNode from '../core/AnimatedNode';
import SharedObject from './SharedObject';

export default class SharedValue extends AnimatedNode {

  static idCounter = 0;

  constructor(value) {
    this.id = SharedValue.idCounter++;
    this.initialValue = value;

    NativeModule.registerSharedValue(this.id, this.initialValue);
    this.callbacks = {}

    super(
      {
        type: 'shared',
        sharedValueId: this.id,
        initialValue: this.initialValue,
      }, [],
    );
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

  toString() {
    return `AnimatedValue, id: ${this.__nodeID}`;
  }

  static create(value) {
    console.log('create sv ' + JSON.stringify(value));

    if (value.isWorklet) {
      const argIds = [];
      for (let arg of value.args) {
        argIds.push(arg.id);
      }
      value = { 
        workletId: value.body.id, 
        isWorklet: true,
        argIds,
      };

    } else if (value instanceof Worklet) {
      value = {
        workletId: value.id,
        isFunction: true,
      }

    } else if (Array.isArray(value)) {
      const argIds = [];
      for (let arg of value) {
        argIds.push(arg.id);
      }
      value = {
        isArray: true,
        argIds,
      }

    } else if (typeof value === 'object') {
      const propNames = [];
      const ids = [];
      for (let prop in value) {
        propNames.push(prop);
        ids.push(value[prop].id);
      }
      value = {
        isObject: true,
        propNames,
        ids,
      }
      return SharedObject(value);
    }

    return new SharedValue(value);
  }

}