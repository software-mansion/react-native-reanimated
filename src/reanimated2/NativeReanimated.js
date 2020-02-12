import {
  DeviceEventEmitter,
  Platform,
  TurboModuleRegistry,
} from 'react-native';
const InnerNativeModule = global.NativeReanimated || TurboModuleRegistry.get("NativeReanimated");

export default {

  // shared value
  registerSharedValue(valueId, value) {
    InnerNativeModule.registerSharedValue(valueId, value);
  },

  unregisterSharedValue(valueId) {
    InnerNativeModule.unregisterSharedValue(valueId);
  },

  async getSharedValue(valueId, callback) {
    return InnerNativeModule.getSharedValue(valueId, callback);
  },

  setSharedValue(valueId, newValue) {
    InnerNativeModule.setSharedValue(valueId, newValue);
  },

  connectViewWithValue(viewTag, valueId, propName) {
    InnerNativeModule.connectViewWithValue(viewTag, valueId, propName);
  },

  disconnectViewFromValue(viewTag, valueId) {
    InnerNativeModule.disconnectViewFromValue(viewTag, valueId);
  },

  // worklet

  registerWorklet(workletId, workletName) {
    InnerNativeModule.registerWorklet(workletId, workletName);
  },

  connectEventWithWorklet(workletID, viewID, eventName /* onGestureStateChange */ ) {

  },

  disconnectEventFromWorklet(workletID, viewID, eventName /* onGestureStateChange */ ) {

  },

  startWorklet(workletId, sharedValues /* shared values (worklet ID) */ ) {
    InnerNativeModule.activateWorklet(workletId);
  },

  stopWorklet(workletId) {
    InnerNativeModule.activateWorklet(workletId);
  },

  unregisterWorklet(workletId) {
    InnerNativeModule.unregisterWorklet(workletId);
  },

};