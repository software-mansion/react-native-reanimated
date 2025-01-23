#import <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/LayoutReanimation/REAAnimationsManager.h>
#import <reanimated/apple/LayoutReanimation/REASwizzledUIManager.h>
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

#ifndef NDEBUG
#import <reanimated/apple/LayoutReanimation/REAScreensHelper.h>
#endif

#import <worklets/WorkletRuntime/ReanimatedRuntime.h>
#import <worklets/apple/WorkletsMessageThread.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTBridge+Private.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>
#import <react/renderer/core/ShadowNode.h>
#import <react/renderer/uimanager/primitives.h>
#endif

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
    WorkletsModule *workletsModule,
    bool isBridgeless)
{
  auto nodesManager = reaModule.nodesManager;

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(reaModule.bridge.runtime);

  PlatformDepMethodsHolder platformDepMethodsHolder = makePlatformDepMethodsHolder(bridge, nodesManager, reaModule);

  const auto workletsModuleProxy = [workletsModule getWorkletsModuleProxy];

  auto reanimatedModuleProxy = std::make_shared<ReanimatedModuleProxy>(
      workletsModuleProxy, rnRuntime, jsInvoker, platformDepMethodsHolder, isBridgeless, getIsReducedMotion());
  reanimatedModuleProxy->init(platformDepMethodsHolder);

  commonInit(reaModule, reanimatedModuleProxy);
  // Layout Animation callbacks setup
#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  REAAnimationsManager *animationsManager = reaModule.animationsManager;
  setupLayoutAnimationCallbacks(reanimatedModuleProxy, animationsManager);

#endif // RCT_NEW_ARCH_ENABLED

  return reanimatedModuleProxy;
}

void commonInit(REAModule *reaModule, std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy)
{
  [reaModule.nodesManager registerEventHandler:^(id<RCTEvent> event) {
    // handles RCTEvents from RNGestureHandler
    std::string eventName = [event.eventName UTF8String];
    int emitterReactTag = [event.viewTag intValue];
    id eventData = [event arguments][2];
    jsi::Runtime &uiRuntime = reanimatedModuleProxy->getUIRuntime();
    jsi::Value payload = convertObjCObjectToJSIValue(uiRuntime, eventData);
    double currentTime = CACurrentMediaTime() * 1000;
    reanimatedModuleProxy->handleEvent(eventName, emitterReactTag, payload, currentTime);
  }];

#ifdef RCT_NEW_ARCH_ENABLED
  std::weak_ptr<ReanimatedModuleProxy> weakReanimatedModuleProxy = reanimatedModuleProxy; // to avoid retain cycle
  [reaModule.nodesManager registerPerformOperations:^() {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      reanimatedModuleProxy->performOperations();
    }
  }];
#endif // RCT_NEW_ARCH_ENABLED
}

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else // RCT_NEW_ARCH_ENABLED
void setupLayoutAnimationCallbacks(
    std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy,
    REAAnimationsManager *animationsManager)
{
  std::weak_ptr<ReanimatedModuleProxy> weakReanimatedModuleProxy = reanimatedModuleProxy; // to avoid retain cycle
  [animationsManager
      setAnimationStartingBlock:^(NSNumber *_Nonnull tag, LayoutAnimationType type, NSDictionary *_Nonnull values) {
        if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
          jsi::Runtime &rt = reanimatedModuleProxy->getUIRuntime();
          jsi::Object yogaValues(rt);
          for (NSString *key in values.allKeys) {
            NSObject *value = values[key];
            if ([values[key] isKindOfClass:[NSArray class]]) {
              NSArray *transformArray = (NSArray *)value;
              jsi::Array matrix(rt, 9);
              for (int i = 0; i < 9; i++) {
                matrix.setValueAtIndex(rt, i, [(NSNumber *)transformArray[i] doubleValue]);
              }
              yogaValues.setProperty(rt, [key UTF8String], matrix);
            } else {
              yogaValues.setProperty(rt, [key UTF8String], [(NSNumber *)value doubleValue]);
            }
          }
          reanimatedModuleProxy->layoutAnimationsManager().startLayoutAnimation(rt, [tag intValue], type, yogaValues);
        }
      }];

  [animationsManager setHasAnimationBlock:^(NSNumber *_Nonnull tag, LayoutAnimationType type) {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      bool hasLayoutAnimation =
          reanimatedModuleProxy->layoutAnimationsManager().hasLayoutAnimation([tag intValue], type);
      return hasLayoutAnimation ? YES : NO;
    }
    return NO;
  }];

  [animationsManager setShouldAnimateExitingBlock:^(NSNumber *_Nonnull tag, BOOL shouldAnimate) {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      bool shouldAnimateExiting =
          reanimatedModuleProxy->layoutAnimationsManager().shouldAnimateExiting([tag intValue], shouldAnimate);
      return shouldAnimateExiting ? YES : NO;
    }
    return NO;
  }];

  [animationsManager setAnimationRemovingBlock:^(NSNumber *_Nonnull tag) {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      reanimatedModuleProxy->layoutAnimationsManager().clearLayoutAnimationConfig([tag intValue]);
    }
  }];

  [animationsManager setSharedTransitionRemovingBlock:^(NSNumber *_Nonnull tag) {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      reanimatedModuleProxy->layoutAnimationsManager().clearSharedTransitionConfig([tag intValue]);
    }
  }];

  [animationsManager setCancelAnimationBlock:^(NSNumber *_Nonnull tag) {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      jsi::Runtime &rt = reanimatedModuleProxy->getUIRuntime();
      reanimatedModuleProxy->layoutAnimationsManager().cancelLayoutAnimation(rt, [tag intValue]);
    }
  }];

  [animationsManager setFindPrecedingViewTagForTransitionBlock:^NSNumber *_Nullable(NSNumber *_Nonnull tag) {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      int resultTag =
          reanimatedModuleProxy->layoutAnimationsManager().findPrecedingViewTagForTransition([tag intValue]);
      return resultTag == -1 ? nil : @(resultTag);
    }
    return nil;
  }];

  [animationsManager setGetSharedGroupBlock:^NSArray<NSNumber *> *_Nullable(NSNumber *_Nonnull tag) {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      const auto &results = reanimatedModuleProxy->layoutAnimationsManager().getSharedGroup([tag intValue]);
      NSMutableArray<NSNumber *> *convertedResult = [NSMutableArray new];
      for (const int tag : results) {
        [convertedResult addObject:@(tag)];
      }
      return convertedResult;
    }
    return nil;
  }];
#ifndef NDEBUG
  [animationsManager setCheckDuplicateSharedTagBlock:^(REAUIView *view, NSNumber *_Nonnull viewTag) {
    if (auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock()) {
      REAUIView *screen = [REAScreensHelper getScreenForView:(REAUIView *)view];
      auto screenTag = [screen.reactTag intValue];
      // Here we check if there are duplicate tags (we don't use return bool value currently)
      reanimatedModuleProxy->layoutAnimationsManager().checkDuplicateSharedTag([viewTag intValue], screenTag);
    }
  }];
#endif // NDEBUG
}
#endif // RCT_NEW_ARCH_ENABLED

} // namespace reanimated
