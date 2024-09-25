#if __cplusplus

#import <React/RCTEventDispatcher.h>
#import <reanimated/NativeModules/NativeReanimatedModule.h>
#import <reanimated/apple/LayoutReanimation/REAAnimationsManager.h>
#import <reanimated/apple/REAModule.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/keyboardObserver/REAKeyboardEventObserver.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>
#import <worklets/apple/WorkletsModule.h>
#import <memory>

namespace reanimated {

static inline bool getIsReducedMotion();

std::shared_ptr<reanimated::NativeReanimatedModule> createReanimatedModule(
    REAModule *reaModule,
    RCTBridge *bridge,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    WorkletsModule *workletsModule);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
std::shared_ptr<reanimated::NativeReanimatedModule>
createReanimatedModuleBridgeless(
    REAModule *reaModule,
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &runtime,
    WorkletsModule *workletsModule,
    RuntimeExecutor runtimeExecutor);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

void commonInit(
    REAModule *reaModule,
    std::shared_ptr<NativeReanimatedModule> nativeReanimatedModule);

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else // RCT_NEW_ARCH_ENABLED
void setupLayoutAnimationCallbacks(
    std::shared_ptr<NativeReanimatedModule> nativeReanimatedModule,
    REAAnimationsManager *animationsManager);
#endif // RCT_NEW_ARCH_ENABLED

} // namespace reanimated

#endif //__cplusplus
