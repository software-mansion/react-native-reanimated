#if __cplusplus

#import <REAAnimationsManager.h>
#import <REAKeyboardEventObserver.h>
#import <REAModule.h>
#import <REANodesManager.h>
#import <RNReanimated/NativeReanimatedModule.h>
#import <React/RCTEventDispatcher.h>
#import <ReanimatedSensorContainer.h>
#include <memory>

namespace reanimated {

PlatformDepMethodsHolder makePlatformDepMethodsHolder(
    RCTBridge *bridge,
    REANodesManager *nodesManager,
    REAModule *reaModule);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
PlatformDepMethodsHolder makePlatformDepMethodsHolderBridgeless(
    RCTModuleRegistry *moduleRegistry,
    REANodesManager *nodesManager,
    REAModule *reaModule);
SetGestureStateFunction makeSetGestureStateFunctionBridgeless(
    RCTModuleRegistry *moduleRegistry);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

#ifdef RCT_NEW_ARCH_ENABLED
SynchronouslyUpdateUIPropsFunction makeSynchronouslyUpdateUIPropsFunction(
    REANodesManager *nodesManager);
#else // RCT_NEW_ARCH_ENABLED
UpdatePropsFunction makeUpdatePropsFunction(REAModule *reaModule);
MeasureFunction makeMeasureFunction(RCTUIManager *uiManager);
ScrollToFunction makeScrollToFunction(RCTUIManager *uiManager);
DispatchCommandFunction makeDispatchCommandFunction(RCTUIManager *uiManager);
ConfigurePropsFunction makeConfigurePropsFunction(REAModule *reaModule);
ObtainPropFunction makeObtainPropFunction(REAModule *reaModule);
#endif // RCT_NEW_ARCH_ENABLED

SetGestureStateFunction makeSetGestureStateFunction(RCTBridge *bridge);
RequestRenderFunction makeRequestRender(REANodesManager *nodesManager);
GetAnimationTimestampFunction makeGetAnimationTimestamp();
ProgressLayoutAnimationFunction makeProgressLayoutAnimation(
    REAModule *reaModule);
EndLayoutAnimationFunction makeEndLayoutAnimation(REAModule *reaModule);
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
