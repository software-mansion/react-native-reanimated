import NativeModule from './NativeReanimated';

class RegistersState {
  options = {
    sharedValues: 1,
    worklets: 2,
    appliers: 3,
  };
  _getRegistersState = async option => {
    if (!Object.keys(this.options).includes(option)) {
      console.warn(`invalid register state option provided: ${option}`);
      return;
    }
    var _this = this;
    return new Promise(function(resolve, reject) {
      NativeModule.getRegistersState(_this.options[option], value => {
        // without setTimeout with timout 0 VM executes resolve before registering the Promise
        setTimeout(() => {
          if (value.substring(0, 5) === 'error') {
            reject(value);
          }
          resolve(value);
        }, 0);
      });
    });
  };

  getRegisteredSharedValuesIds = async () => {
    return this._getRegistersState('sharedValues');
  };

  getRegisteredWorkletsIds = async () => {
    return this._getRegistersState('worklets');
  };

  getRegisteredAppliersIds = async () => {
    return this._getRegistersState('appliers');
  };
}

export default new RegistersState();
