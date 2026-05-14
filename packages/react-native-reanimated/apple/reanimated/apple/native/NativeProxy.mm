#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/REAReducedMotion.h>
#import <reanimated/apple/native/NativeProxy.h>
#import <reanimated/apple/native/PlatformDepMethodsHolderImpl.h>

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

namespace reanimated {

using namespace facebook;
using namespace react;
using namespace worklets;

std::shared_ptr<ReanimatedModuleProxy> createReanimatedModuleProxy(
    REANodesManager *nodesManager,
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    const std::shared_ptr<WorkletRuntime> &uiWorkletRuntime,
    const std::shared_ptr<UIScheduler> &uiScheduler)
{
  REAAssertJavaScriptQueue();

  PlatformDepMethodsHolder platformDepMethodsHolder = makePlatformDepMethodsHolder(moduleRegistry, nodesManager);

  auto reanimatedModuleProxy = std::make_shared<ReanimatedModuleProxy>(
      uiWorkletRuntime, uiScheduler, rnRuntime, jsInvoker, platformDepMethodsHolder, getIsReducedMotion());
  reanimatedModuleProxy->init(platformDepMethodsHolder);

  std::weak_ptr<ReanimatedModuleProxy> weakReanimatedModuleProxy = reanimatedModuleProxy; // to avoid retain cycle
  [nodesManager registerPerformOperations:^() {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      reanimatedModuleProxy->performOperations();
    }
  }];

  return reanimatedModuleProxy;
}

} // namespace reanimated
