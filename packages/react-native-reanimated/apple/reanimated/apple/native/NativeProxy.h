#if __cplusplus

#import <React/RCTEventDispatcher.h>
#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/apple/LayoutReanimation/REAAnimationsManager.h>
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
    RCTBridge *bridge,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    WorkletsModule *workletsModule,
    bool isBridgeless);

void commonInit(
    REAModule *reaModule,
    std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy);

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else // RCT_NEW_ARCH_ENABLED
void setupLayoutAnimationCallbacks(
    std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy,
    REAAnimationsManager *animationsManager);
#endif // RCT_NEW_ARCH_ENABLED

} // namespace reanimated

#endif //__cplusplus
