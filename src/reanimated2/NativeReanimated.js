import {
  DeviceEventEmitter,
  Platform,
  TurboModuleRegistry,
} from 'react-native';
const InnerNativeModule = global.NativeReanimated || TurboModuleRegistry.get("NativeReanimated");

export default class NativeModule {

  // shared value
  createSharedValue(valueId, value) {
    InnerNativeModule.createSharedValue(valueId, value);
  }

  destroySharedValue(valueId) {
    InnerNativeModule.destroySharedValue(valueId);
  }

  async getSharedValue(valueId) {
    return InnerNativeModule.getSharedValue(valueId);
  }

  setSharedValue(valueId, newValue) {
    InnerNativeModule.setSharedValue(valueId, newValue);
  }

  connectViewWithValue(viewTag, valueId, propName) {
    InnerNativeModule.connectViewWithValue(viewTag, valueId, propName);
  }

  disconnectViewFromValue(viewTag, valueId) {
    InnerNativeModule.disconnectViewFromValue(viewTag, valueId);
  }

  // worklet

  registerWorklet(workletId, worklet) {
    InnerNativeModule.registerWorklet(workletId, worklet);
  }

  connectEventWithWorklet(workletID, viewID, eventName /* onGestureStateChange */ ) {

  }

  disconnectEventFromWorklet(workletID, viewID, eventName /* onGestureStateChange */ ) {

  }

  startWorklet(workletId, arguments /* shared values (worklet ID) */ ) {
    InnerNativeModule.activateWorklet(workletId);
  }

  stopWorklet(workletId) {
    InnerNativeModule.activateWorklet(workletId);
  }

  unregisterWorklet(workletId) {
    DeviceEventEmitter.removeListener()
    InnerNativeModule.unregisterWorklet(workletId);
  }

}