#import <worklets/Compat/StableApi.h>
#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/REAReducedMotion.h>
#import <reanimated/apple/native/NativeProxy.h>
#import <reanimated/apple/native/PlatformDepMethodsHolderImpl.h>
#import <reanimated/apple/native/REAJSIUtils.h>

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
    const std::shared_ptr<WorkletRuntimeHolder> &uiRuntimeHolder,
    const std::shared_ptr<UISchedulerHolder> &uiSchedulerHolder)
{
  REAAssertJavaScriptQueue();

  PlatformDepMethodsHolder platformDepMethodsHolder = makePlatformDepMethodsHolder(moduleRegistry, nodesManager);

  auto reanimatedModuleProxy = std::make_shared<ReanimatedModuleProxy>(
      uiRuntimeHolder, uiSchedulerHolder, rnRuntime, jsInvoker, platformDepMethodsHolder, getIsReducedMotion());
  reanimatedModuleProxy->init(platformDepMethodsHolder);

  auto &uiRuntime = *getRuntimeAddressFromHolder(uiRuntimeHolder);

  [nodesManager registerEventHandler:^(id<RCTEvent> event) {
    // handles RCTEvents from RNGestureHandler
    std::string eventName = [event.eventName UTF8String];
    int emitterReactTag = [event.viewTag intValue];
    id eventData = [event arguments][2];
    jsi::Value payload = convertObjCObjectToJSIValue(uiRuntime, eventData);
    double currentTime = CACurrentMediaTime() * 1000;
    reanimatedModuleProxy->handleEvent(eventName, emitterReactTag, payload, currentTime);
  }];

  std::weak_ptr<ReanimatedModuleProxy> weakReanimatedModuleProxy = reanimatedModuleProxy; // to avoid retain cycle
  [nodesManager registerPerformOperations:^() {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      reanimatedModuleProxy->performOperations(false);
    }
  }];

  return reanimatedModuleProxy;
}

} // namespace reanimated
