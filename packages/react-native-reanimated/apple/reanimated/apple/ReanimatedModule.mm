#import <React/RCTBridge+Private.h>
#import <React/RCTCallInvoker.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>

#import <reanimated/Compat/WorkletsApi.h>
#import <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#import <reanimated/Tools/FeatureFlags.h>
#import <reanimated/Tools/SingleInstanceChecker.h>
#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/REAAssertTurboModuleManagerQueue.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/ReanimatedModule.h>
#import <reanimated/apple/native/NativeProxy.h>
#import <reanimated/apple/native/REAJSIUtils.h>

using namespace facebook::react;
using namespace reanimated;
using namespace worklets;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation ReanimatedModule {
  __weak RCTSurfacePresenter *_surfacePresenter;
  std::shared_ptr<ReanimatedModuleProxy> _reanimatedModuleProxy;
#ifndef NDEBUG
  reanimated::SingleInstanceChecker<ReanimatedModule> singleInstanceChecker_;
#endif // NDEBUG
  bool hasListeners;
}

@synthesize moduleRegistry = _moduleRegistry;
@synthesize callInvoker = _callInvoker;

RCT_EXPORT_MODULE(ReanimatedModule);

- (void)invalidate
{
  REAAssertTurboModuleManagerQueue();

  [_nodesManager invalidate];
  _reanimatedModuleProxy.reset();
  [super invalidate];
}

- (void)attachReactEventListener:(const std::shared_ptr<ReanimatedModuleProxy> &)reanimatedModuleProxy
{
  REAAssertJavaScriptQueue();

  std::weak_ptr<ReanimatedModuleProxy> reanimatedModuleProxyWeak = reanimatedModuleProxy;
  RCTScheduler *scheduler = [_surfacePresenter scheduler];
  __weak __typeof__(self) weakSelf = self;
  _surfacePresenter.runtimeExecutor(^(jsi::Runtime &runtime) {
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    auto eventListener =
        std::make_shared<facebook::react::EventListener>([reanimatedModuleProxyWeak](const RawEvent &rawEvent) {
          if (!RCTIsMainQueue()) {
            // event listener called on the JS thread, let's ignore this event
            // as we cannot safely access worklet runtime here
            // and also we don't care about topLayout events
            return false;
          }
          if (const auto reanimatedModuleProxy = reanimatedModuleProxyWeak.lock()) {
            return reanimatedModuleProxy->handleRawEvent(rawEvent, CACurrentMediaTime() * 1000);
          }
          return false;
        });
    [scheduler addEventListener:eventListener];
  });
}

- (void)registerRCTEventHandler:(const std::shared_ptr<ReanimatedModuleProxy> &)reanimatedModuleProxy
               uiWorkletRuntime:(const std::shared_ptr<WorkletRuntime> &)uiWorkletRuntime
{
  REAAssertJavaScriptQueue();

  auto &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiWorkletRuntime);
  std::weak_ptr<ReanimatedModuleProxy> weakReanimatedModuleProxy = reanimatedModuleProxy;

  // When USE_ANIMATION_BACKEND is on, flushes run inside handleEventAndFlush; otherwise
  // REANodesManager calls performOperations after the event (see REANodesManager).
  [_nodesManager registerEventHandler:^(id<RCTEvent> event) {
    auto reanimatedModuleProxy = weakReanimatedModuleProxy.lock();
    if (!reanimatedModuleProxy) {
      return;
    }
    // handles RCTEvents from RNGestureHandler
    std::string eventName = [event.eventName UTF8String];
    int emitterReactTag = [event.viewTag intValue];
    id eventData = [event arguments][2];
    jsi::Value payload = convertObjCObjectToJSIValue(uiRuntime, eventData);
    if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
      reanimatedModuleProxy->handleEventAndFlush(eventName, emitterReactTag, payload, GrandCallbackSource::Event);
    } else {
      const double currentTime = CACurrentMediaTime() * 1000;
      reanimatedModuleProxy->handleEvent(eventName, emitterReactTag, payload, currentTime);
    }
  }];
}

#pragma mark-- Bridgeless methods

/*
 * Taken from RCTNativeAnimatedTurboModule:
 * This selector is invoked via BridgelessTurboModuleSetup.
 */
- (void)setSurfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter
{
  REAAssertJavaScriptQueue();
  _surfacePresenter = surfacePresenter;
}

- (void)setBridge:(RCTBridge *)bridge
{
  REAAssertJavaScriptQueue();
  [super setBridge:bridge];
  _nodesManager = [[REANodesManager alloc] init];
  _nodesManager.surfacePresenter = _surfacePresenter;
  [[self.moduleRegistry moduleForName:"EventDispatcher"] addDispatchObserver:self];
}

#pragma mark-- Events

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"onReanimatedCall", @"onReanimatedPropsChange" ];
}

- (void)eventDispatcherWillDispatchEvent:(id<RCTEvent>)event
{
  // Events can be dispatched from any queue
  [_nodesManager dispatchEvent:event];
}

- (void)startObserving
{
  hasListeners = YES;
}

- (void)stopObserving
{
  hasListeners = NO;
}

- (void)sendEventWithName:(NSString *)eventName body:(id)body
{
  if (hasListeners) {
    [super sendEventWithName:eventName body:body];
  }
}

/**
 * Currently on iOS React Native can go into a non-fatal race condition
 * on a double reload. Double reload can happen during an OTA update,
 * when an app is reloaded immediately after evaluating the bundle.
 * We need to bail on it without throwing exceptions.
 */
- (BOOL)hasReactNativeFailedReload
{
  id workletsModule = [_moduleRegistry moduleForName:"WorkletsModule"];
  if (![_moduleRegistry moduleIsInitialized:[workletsModule class]]) {
    return YES;
  }

  // On a double reload React Native can momentarily leave the surface presenter without
  // a scheduler. This is another manifestation of the same non-fatal reload race, so we
  // bail on it here instead of asserting on a nil scheduler later in installTurboModule.
  if ([_surfacePresenter scheduler] == nil) {
    return YES;
  }

  return NO;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  REAAssertJavaScriptQueue();

  if ([self hasReactNativeFailedReload]) {
    return @NO;
  }

  auto jsCallInvoker = _callInvoker.callInvoker;

  react_native_assert(self.bridge != nullptr);
  react_native_assert(self.bridge.runtime != nullptr);
  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);

  const auto uiWorkletRuntime = [self getUIRuntime:rnRuntime];
  const auto uiScheduler = [self getUIScheduler:rnRuntime];

  _reanimatedModuleProxy = reanimated::createReanimatedModuleProxy(
      _nodesManager, _moduleRegistry, rnRuntime, jsCallInvoker, uiWorkletRuntime, uiScheduler);

  auto &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiWorkletRuntime);
  RNRuntimeDecorator::decorate(rnRuntime, uiRuntime, _reanimatedModuleProxy);

  react_native_assert(_surfacePresenter != nil && "_surfacePresenter is nil");
  RCTScheduler *scheduler = [_surfacePresenter scheduler];
  react_native_assert(scheduler != nil && "_surfacePresenter.scheduler is nil");
  react_native_assert(scheduler.uiManager != nil && "_surfacePresenter.scheduler.uiManager is nil");
  const auto &uiManager = scheduler.uiManager;
  react_native_assert(uiManager.get() != nil);
  _reanimatedModuleProxy->initializeFabric(uiManager);
  [self attachReactEventListener:_reanimatedModuleProxy];
  [self registerRCTEventHandler:_reanimatedModuleProxy uiWorkletRuntime:uiWorkletRuntime];

  return @YES;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  REAAssertJavaScriptQueue();
  return std::make_shared<facebook::react::NativeReanimatedModuleSpecJSI>(params);
}

- (std::shared_ptr<WorkletRuntime>)getUIRuntime:(jsi::Runtime &)rnRuntime
{
  const auto global = rnRuntime.global();
  const auto uiRuntime =
      getWorkletRuntimeFromHolder(rnRuntime, global.getPropertyAsObject(rnRuntime, "__UI_WORKLET_RUNTIME_HOLDER"));
  return uiRuntime;
}

- (std::shared_ptr<UIScheduler>)getUIScheduler:(jsi::Runtime &)rnRuntime
{
  const auto global = rnRuntime.global();
  const auto uiScheduler =
      getUISchedulerFromHolder(rnRuntime, global.getPropertyAsObject(rnRuntime, "__UI_SCHEDULER_HOLDER"));
  return uiScheduler;
}

@end
