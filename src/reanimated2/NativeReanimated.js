import {
  TurboModuleRegistry,
} from 'react-native';
import ReanimatedModule from '../ReanimatedModule';
const InnerNativeModule = global.NativeReanimated || TurboModuleRegistry.get("NativeReanimated");

export default {

  // shared value
  registerSharedValue(valueId, value) {
    InnerNativeModule.registerSharedValue(valueId, value);
  },

  unregisterSharedValue(valueId) {
    InnerNativeModule.unregisterSharedValue(valueId);
  },

  async getSharedValueAsync(valueId, callback) {
    return InnerNativeModule.getSharedValueAsync(valueId, callback);
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

  registerWorklet(workletId, holder) {
    InnerNativeModule.registerWorklet(workletId, holder);
  },

  connectEventWithWorklet(workletID, viewID, eventName /* onGestureStateChange */ ) {

  },

  disconnectEventFromWorklet(workletID, viewID, eventName /* onGestureStateChange */ ) {

  },

  registerApplier(applierId, workletId, sharedValueIds /* shared values (worklet ID) */ ) {
    InnerNativeModule.registerApplierOnRender(applierId, workletId, sharedValueIds);
    ReanimatedModule.triggerRender();
  },

  unregisterApplier(applierId) {
    InnerNativeModule.unregisterApplierFromRender(applierId);
  },

  unregisterWorklet(workletId) {
    InnerNativeModule.unregisterWorklet(workletId);
  },

};