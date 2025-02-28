#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/native/NativeProxy.h>
#import <reanimated/apple/native/PlatformDepMethodsHolderImpl.h>
#import <reanimated/apple/native/REAJSIUtils.h>

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

namespace reanimated {

using namespace facebook;
using namespace react;

static inline bool getIsReducedMotion()
{
#if __has_include(<UIKit/UIAccessibility.h>)
  return UIAccessibilityIsReduceMotionEnabled();
#else
  return NSWorkspace.sharedWorkspace.accessibilityDisplayShouldReduceMotion;
#endif // __has_include(<UIKit/UIAccessibility.h>)
}

std::shared_ptr<ReanimatedModuleProxy> createReanimatedModule(
    REAModule *reaModule,
    RCTModuleRegistry *moduleRegistry,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    WorkletsModule *workletsModule)
{
  REAAssertJavaScriptQueue();

  auto nodesManager = reaModule.nodesManager;

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(reaModule.bridge.runtime);

  PlatformDepMethodsHolder platformDepMethodsHolder =
      makePlatformDepMethodsHolder(moduleRegistry, nodesManager, reaModule);

  const auto workletsModuleProxy = [workletsModule getWorkletsModuleProxy];

  auto reanimatedModuleProxy = std::make_shared<ReanimatedModuleProxy>(
      workletsModuleProxy, rnRuntime, jsInvoker, platformDepMethodsHolder, getIsReducedMotion());
  reanimatedModuleProxy->init(platformDepMethodsHolder);

  commonInit(reaModule, workletsModuleProxy->getUIWorkletRuntime()->getJSIRuntime(), reanimatedModuleProxy);

  return reanimatedModuleProxy;
}

void commonInit(
    REAModule *reaModule,
    jsi::Runtime &uiRuntime,
    std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy)
{
  REAAssertJavaScriptQueue();

  [reaModule.nodesManager registerEventHandler:^(id<RCTEvent> event) {
    // handles RCTEvents from RNGestureHandler
    std::string eventName = [event.eventName UTF8String];
    int emitterReactTag = [event.viewTag intValue];
    id eventData = [event arguments][2];
    jsi::Value payload = convertObjCObjectToJSIValue(uiRuntime, eventData);
    double currentTime = CACurrentMediaTime() * 1000;
    reanimatedModuleProxy->handleEvent(eventName, emitterReactTag, payload, currentTime);
  }];

  std::weak_ptr<ReanimatedModuleProxy> weakReanimatedModuleProxy = reanimatedModuleProxy; // to avoid retain cycle
  [reaModule.nodesManager registerPerformOperations:^() {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      reanimatedModuleProxy->performOperations();
    }
  }];
}

} // namespace reanimated
