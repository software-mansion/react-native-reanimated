#if __cplusplus

#import <REAAnimationsManager.h>
#import <REAKeyboardEventObserver.h>
#import <REAModule.h>
#import <REANodesManager.h>
#import <RNReanimated/CommonReanimatedModule.h>
#import <React/RCTEventDispatcher.h>
#import <ReanimatedSensorContainer.h>
#include <memory>

namespace reanimated {

std::shared_ptr<reanimated::CommonReanimatedModule> createReanimatedModule(
    RCTBridge *bridge,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    const std::string &valueUnpackerCode);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
std::shared_ptr<reanimated::CommonReanimatedModule>
createReanimatedModuleBridgeless(
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &runtime,
    const std::string &valueUnpackerCode,
    RuntimeExecutor runtimeExecutor);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

void commonInit(
    REAModule *reaModule,
    std::shared_ptr<CommonReanimatedModule> commonReanimatedModule);

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else // RCT_NEW_ARCH_ENABLED
void setupLayoutAnimationCallbacks(
    std::shared_ptr<CommonReanimatedModule> commonReanimatedModule,
    REAAnimationsManager *animationsManager);
#endif // RCT_NEW_ARCH_ENABLED

} // namespace reanimated

#endif //__cplusplus
