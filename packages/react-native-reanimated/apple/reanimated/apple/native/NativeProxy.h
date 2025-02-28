#if __cplusplus

#import <React/RCTEventDispatcher.h>
#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/apple/REAModule.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/keyboardObserver/REAKeyboardEventObserver.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>
#import <worklets/apple/WorkletsModule.h>
#import <memory>

namespace reanimated {

static inline bool getIsReducedMotion();

std::shared_ptr<reanimated::ReanimatedModuleProxy> createReanimatedModule(
    REAModule *reaModule,
    RCTModuleRegistry *moduleRegistry,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    WorkletsModule *workletsModule);

void commonInit(
    REAModule *reaModule,
    jsi::Runtime &uiRuntime,
    std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy);

} // namespace reanimated

#endif //__cplusplus
