#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/READisplayLink.h>
#import <reanimated/apple/REAModule.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/RNGestureHandlerStateManager.h>
#import <reanimated/apple/keyboardObserver/REAKeyboardEventObserver.h>
#import <reanimated/apple/native/NativeMethods.h>
#import <reanimated/apple/native/NativeProxy.h>
#import <reanimated/apple/native/PlatformDepMethodsHolderImpl.h>
#import <reanimated/apple/native/REAJSIUtils.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>
#import <react/renderer/core/ShadowNode.h>
#import <react/renderer/uimanager/primitives.h>

#import <React/RCTUIManager.h>

#if TARGET_IPHONE_SIMULATOR
#import <dlfcn.h>
#endif

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
    RCTBridge *bridge,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    WorkletsModule *workletsModule)
{
  auto nodesManager = reaModule.nodesManager;

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(reaModule.bridge.runtime);

  PlatformDepMethodsHolder platformDepMethodsHolder = makePlatformDepMethodsHolder(bridge, nodesManager, reaModule);

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
