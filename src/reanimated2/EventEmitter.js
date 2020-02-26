import NativeModule from './NativeReanimated';

export default class EventEmitter {
    constructor() {
        console.log('EE constructor')
        this.listeners = {}
    }

    addListener(message, callback) {
        console.log(`worklet add listener ${ message } => ${ callback }`)
        this.listeners[message] = callback
        var _this = this
        NativeModule.addWorkletListener(message, function(){return _this.listeners[message]})
    }
/*
    addClientListener(message, callback) {
        this.listeners[message] = callback
    }

    emitClient(message, ...args) {
        if (!(message in this.listeners)) {
            return
        }
        this.listeners[message](...args);
    }*/
}