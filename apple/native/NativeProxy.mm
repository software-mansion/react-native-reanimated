#import <RNReanimated/LayoutAnimationsManager.h>
#import <RNReanimated/NativeMethods.h>
#import <RNReanimated/NativeProxy.h>
#import <RNReanimated/PlatformDepMethodsHolder.h>
#import <RNReanimated/PlatformDepMethodsHolderImpl.h>
#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REAIOSUIScheduler.h>
#import <RNReanimated/REAJSIUtils.h>
#import <RNReanimated/REAKeyboardEventObserver.h>
#import <RNReanimated/REAMessageThread.h>
#import <RNReanimated/REAModule.h>
#import <RNReanimated/REANodesManager.h>
#import <RNReanimated/REASlowAnimations.h>
#import <RNReanimated/REASwizzledUIManager.h>
#import <RNReanimated/RNGestureHandlerStateManager.h>
#import <RNReanimated/ReanimatedRuntime.h>
#import <RNReanimated/ReanimatedSensorContainer.h>

#ifndef NDEBUG
#import <RNReanimated/REAScreensHelper.h>
#endif

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

#import <RNReanimated/READisplayLink.h>

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

namespace reanimated {

using namespace facebook;
using namespace react;

std::shared_ptr<NativeReanimatedModule> createReanimatedModule(
    RCTBridge *bridge,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    const std::string &valueUnpackerCode)
{
  REAModule *reaModule = [bridge moduleForClass:[REAModule class]];

  auto nodesManager = reaModule.nodesManager;

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(reaModule.bridge.runtime);

  auto jsQueue = std::make_shared<REAMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

  PlatformDepMethodsHolder platformDepMethodsHolder = makePlatformDepMethodsHolder(bridge, nodesManager, reaModule);

  std::shared_ptr<UIScheduler> uiScheduler = std::make_shared<REAIOSUIScheduler>();
  std::shared_ptr<JSScheduler> jsScheduler = std::make_shared<JSScheduler>(rnRuntime, jsInvoker);
  constexpr bool isBridgeless = false;

  auto nativeReanimatedModule = std::make_shared<NativeReanimatedModule>(
      rnRuntime, jsScheduler, jsQueue, uiScheduler, platformDepMethodsHolder, valueUnpackerCode, isBridgeless);

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
    RuntimeExecutor runtimeExecutor)
{
  REAModule *reaModule = [moduleRegistry moduleForName:"ReanimatedModule"];

  auto nodesManager = reaModule.nodesManager;

  auto jsQueue = std::make_shared<REAMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

  PlatformDepMethodsHolder platformDepMethodsHolder =
      makePlatformDepMethodsHolderBridgeless(moduleRegistry, nodesManager, reaModule);

  auto uiScheduler = std::make_shared<REAIOSUIScheduler>();
  auto jsScheduler = std::make_shared<JSScheduler>(runtime, runtimeExecutor);
  constexpr bool isBridgeless = true;

  auto nativeReanimatedModule = std::make_shared<NativeReanimatedModule>(
      runtime, jsScheduler, jsQueue, uiScheduler, platformDepMethodsHolder, valueUnpackerCode, isBridgeless);

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
