#if __cplusplus

#import <REAKeyboardEventObserver.h>
#import <REAModule.h>
#import <REANodesManager.h>
#import <React/RCTEventDispatcher.h>
#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>
#import <memory>

namespace reanimated {

PlatformDepMethodsHolder makePlatformDepMethodsHolder(
    RCTModuleRegistry *moduleRegistry,
    REANodesManager *nodesManager,
    REAModule *reaModule);
SetGestureStateFunction makeSetGestureStateFunction(
    RCTModuleRegistry *moduleRegistry);
RequestRenderFunction makeRequestRender(REANodesManager *nodesManager);
GetAnimationTimestampFunction makeGetAnimationTimestamp();
MaybeFlushUIUpdatesQueueFunction makeMaybeFlushUIUpdatesQueueFunction(
    REANodesManager *nodesManager);
RegisterSensorFunction makeRegisterSensorFunction(
    ReanimatedSensorContainer *reanimatedSensorContainer);
UnregisterSensorFunction makeUnregisterSensorFunction(
    ReanimatedSensorContainer *reanimatedSensorContainer);
KeyboardEventSubscribeFunction makeSubscribeForKeyboardEventsFunction(
    REAKeyboardEventObserver *keyboardObserver);
KeyboardEventUnsubscribeFunction makeUnsubscribeFromKeyboardEventsFunction(
    REAKeyboardEventObserver *keyboardObserver);

} // namespace reanimated

#endif //__cplusplus
