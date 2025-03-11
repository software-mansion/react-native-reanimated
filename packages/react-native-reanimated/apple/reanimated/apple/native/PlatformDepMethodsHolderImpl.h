#if __cplusplus

#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/ReanimatedModule.h>
#import <reanimated/apple/keyboardObserver/REAKeyboardEventObserver.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>

namespace reanimated {

PlatformDepMethodsHolder makePlatformDepMethodsHolder(
    RCTModuleRegistry *moduleRegistry,
    REANodesManager *nodesManager);
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
