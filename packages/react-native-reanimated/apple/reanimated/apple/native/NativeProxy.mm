#import <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#import <reanimated/NativeModules/NativeReanimatedModule.h>
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
#import <reanimated/apple/native/REAIOSUIScheduler.h>
#import <reanimated/apple/native/REAJSIUtils.h>
#import <reanimated/apple/native/REAMessageThread.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>

#ifndef NDEBUG
#import <reanimated/apple/LayoutReanimation/REAScreensHelper.h>
#endif

#import <worklets/WorkletRuntime/ReanimatedRuntime.h>

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

std::shared_ptr<NativeReanimatedModule> createReanimatedModule(
    REAModule *reaModule,
    RCTBridge *bridge,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    const std::string &valueUnpackerCode)
{
  auto nodesManager = reaModule.nodesManager;

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(reaModule.bridge.runtime);

  auto jsQueue = std::make_shared<REAMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

  PlatformDepMethodsHolder platformDepMethodsHolder = makePlatformDepMethodsHolder(bridge, nodesManager, reaModule);

  std::shared_ptr<UIScheduler> uiScheduler = std::make_shared<REAIOSUIScheduler>();
  std::shared_ptr<JSScheduler> jsScheduler = std::make_shared<JSScheduler>(rnRuntime, jsInvoker);
  constexpr auto isBridgeless = false;

  auto nativeReanimatedModule = std::make_shared<NativeReanimatedModule>(
      rnRuntime,
      jsScheduler,
      jsQueue,
      uiScheduler,
      platformDepMethodsHolder,
      valueUnpackerCode,
      isBridgeless,
      getIsReducedMotion());

  commonInit(reaModule, nativeReanimatedModule);
  // Layout Animation callbacks setup
#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  REAAnimationsManager *animationsManager = reaModule.animationsManager;
  setupLayoutAnimationCallbacks(nativeReanimatedModule, animationsManager);

#endif // RCT_NEW_ARCH_ENABLED

  return nativeReanimatedModule;
}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
std::shared_ptr<NativeReanimatedModule> createReanimatedModuleBridgeless(
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &runtime,
    const std::string &valueUnpackerCode,
#if REACT_NATIVE_MINOR_VERSION >= 77
    const std::shared_ptr<facebook::react::CallInvoker> &callInvoker
#else
    RuntimeExecutor runtimeExecutor
#endif
)
{
  REAModule *reaModule = [moduleRegistry moduleForName:"ReanimatedModule"];

  auto nodesManager = reaModule.nodesManager;

  auto jsQueue = std::make_shared<REAMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

  PlatformDepMethodsHolder platformDepMethodsHolder =
      makePlatformDepMethodsHolderBridgeless(moduleRegistry, nodesManager, reaModule);

  auto uiScheduler = std::make_shared<REAIOSUIScheduler>();

#if REACT_NATIVE_MINOR_VERSION >= 77
  auto jsScheduler = std::make_shared<JSScheduler>(runtime, callInvoker);
#else
  auto jsScheduler = std::make_shared<JSScheduler>(runtime, runtimeExecutor);
#endif

  constexpr auto isBridgeless = true;

  auto nativeReanimatedModule = std::make_shared<NativeReanimatedModule>(
      runtime,
      jsScheduler,
      jsQueue,
      uiScheduler,
      platformDepMethodsHolder,
      valueUnpackerCode,
      isBridgeless,
      getIsReducedMotion());

  commonInit(reaModule, nativeReanimatedModule);

  return nativeReanimatedModule;
}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

void commonInit(REAModule *reaModule, std::shared_ptr<NativeReanimatedModule> nativeReanimatedModule)
{
  [reaModule.nodesManager registerEventHandler:^(id<RCTEvent> event) {
    // handles RCTEvents from RNGestureHandler
    std::string eventName = [event.eventName UTF8String];
    int emitterReactTag = [event.viewTag intValue];
    id eventData = [event arguments][2];
    jsi::Runtime &uiRuntime = nativeReanimatedModule->getUIRuntime();
    jsi::Value payload = convertObjCObjectToJSIValue(uiRuntime, eventData);
    double currentTime = CACurrentMediaTime() * 1000;
    nativeReanimatedModule->handleEvent(eventName, emitterReactTag, payload, currentTime);
  }];

#ifdef RCT_NEW_ARCH_ENABLED
  std::weak_ptr<NativeReanimatedModule> weakNativeReanimatedModule = nativeReanimatedModule; // to avoid retain cycle
  [reaModule.nodesManager registerPerformOperations:^() {
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      nativeReanimatedModule->performOperations();
    }
  }];
#endif // RCT_NEW_ARCH_ENABLED
}

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else // RCT_NEW_ARCH_ENABLED
void setupLayoutAnimationCallbacks(
    std::shared_ptr<NativeReanimatedModule> nativeReanimatedModule,
    REAAnimationsManager *animationsManager)
{
  std::weak_ptr<NativeReanimatedModule> weakNativeReanimatedModule = nativeReanimatedModule; // to avoid retain cycle
  [animationsManager
      setAnimationStartingBlock:^(NSNumber *_Nonnull tag, LayoutAnimationType type, NSDictionary *_Nonnull values) {
        if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
          jsi::Runtime &rt = nativeReanimatedModule->getUIRuntime();
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
          nativeReanimatedModule->layoutAnimationsManager().startLayoutAnimation(rt, [tag intValue], type, yogaValues);
        }
      }];

  [animationsManager setHasAnimationBlock:^(NSNumber *_Nonnull tag, LayoutAnimationType type) {
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      bool hasLayoutAnimation =
          nativeReanimatedModule->layoutAnimationsManager().hasLayoutAnimation([tag intValue], type);
      return hasLayoutAnimation ? YES : NO;
    }
    return NO;
  }];

  [animationsManager setShouldAnimateExitingBlock:^(NSNumber *_Nonnull tag, BOOL shouldAnimate) {
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      bool shouldAnimateExiting =
          nativeReanimatedModule->layoutAnimationsManager().shouldAnimateExiting([tag intValue], shouldAnimate);
      return shouldAnimateExiting ? YES : NO;
    }
    return NO;
  }];

  [animationsManager setAnimationRemovingBlock:^(NSNumber *_Nonnull tag) {
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      nativeReanimatedModule->layoutAnimationsManager().clearLayoutAnimationConfig([tag intValue]);
    }
  }];

  [animationsManager setSharedTransitionRemovingBlock:^(NSNumber *_Nonnull tag) {
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      nativeReanimatedModule->layoutAnimationsManager().clearSharedTransitionConfig([tag intValue]);
    }
  }];

  [animationsManager setCancelAnimationBlock:^(NSNumber *_Nonnull tag) {
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      jsi::Runtime &rt = nativeReanimatedModule->getUIRuntime();
      nativeReanimatedModule->layoutAnimationsManager().cancelLayoutAnimation(rt, [tag intValue]);
    }
  }];

  [animationsManager setFindPrecedingViewTagForTransitionBlock:^NSNumber *_Nullable(NSNumber *_Nonnull tag) {
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      int resultTag =
          nativeReanimatedModule->layoutAnimationsManager().findPrecedingViewTagForTransition([tag intValue]);
      return resultTag == -1 ? nil : @(resultTag);
    }
    return nil;
  }];

  [animationsManager setGetSharedGroupBlock:^NSArray<NSNumber *> *_Nullable(NSNumber *_Nonnull tag) {
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      const auto &results = nativeReanimatedModule->layoutAnimationsManager().getSharedGroup([tag intValue]);
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
    if (auto nativeReanimatedModule = weakNativeReanimatedModule.lock()) {
      REAUIView *screen = [REAScreensHelper getScreenForView:(REAUIView *)view];
      auto screenTag = [screen.reactTag intValue];
      // Here we check if there are duplicate tags (we don't use return bool value currently)
      nativeReanimatedModule->layoutAnimationsManager().checkDuplicateSharedTag([viewTag intValue], screenTag);
    }
  }];
#endif // NDEBUG
}
#endif // RCT_NEW_ARCH_ENABLED

} // namespace reanimated
