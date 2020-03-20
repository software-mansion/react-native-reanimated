import NativeModule from './NativeReanimated';
import Worklet from './Worklet';
import AnimatedNode from '../core/AnimatedNode';
import ReanimatedModule from '../ReanimatedModule';

export default class SharedValue extends AnimatedNode {

  static idCounter = 0;

  constructor(value) {
    const newId = SharedValue.idCounter++;
    super(
      {
        type: 'shared',
        sharedValueId: newId,
        initialValue: value,
      }, [],
    );

    this.id = newId;
    this.initialValue = value;

    NativeModule.registerSharedValue(this.id, this.initialValue);
    this.callbacks = {}
  }

  async get() {
    const uid = Math.floor(Math.random()*1e9);
    var _this = this;
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
    ReanimatedModule.setValue(this.__nodeID, newValue);
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
      const initValue = {
        isObject: true,
        propNames,
        ids,
      }
      const sv = new SharedValue(initValue);

      for (let prop in value) {
        if (!sv[prop]) {
          sv[prop] = value[prop];
        }
      }
      return sv;
    }

    return new SharedValue(value);
  }

}