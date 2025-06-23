#import <React/RCTBridge+Private.h>
#import <React/RCTCallInvoker.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>

#import <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/REAAssertTurboModuleManagerQueue.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/ReanimatedModule.h>
#import <reanimated/apple/native/NativeProxy.h>

#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/apple/WorkletsModule.h>

using namespace facebook::react;
using namespace reanimated;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation ReanimatedModule {
  __weak RCTSurfacePresenter *_surfacePresenter;
#ifndef NDEBUG
  SingleInstanceChecker<ReanimatedModule> singleInstanceChecker_;
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
  [super invalidate];
}

- (void)attachReactEventListener:(const std::shared_ptr<ReanimatedModuleProxy>)reanimatedModuleProxy
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
  return ![_moduleRegistry moduleIsInitialized:WorkletsModule.class];
}

- (void)checkBridgeless
{
  auto isBridgeless = ![self.bridge isKindOfClass:[RCTCxxBridge class]];
  react_native_assert(isBridgeless && "[Reanimated] react-native-reanimated only supports bridgeless mode");
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  REAAssertJavaScriptQueue();

  if ([self hasReactNativeFailedReload]) {
    return @NO;
  }

  WorkletsModule *workletsModule = [_moduleRegistry moduleForName:"WorkletsModule"];
  auto jsCallInvoker = _callInvoker.callInvoker;

  react_native_assert(self.bridge != nullptr);
  [self checkBridgeless];
  react_native_assert(self.bridge.runtime != nullptr);
  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);

  auto reanimatedModuleProxy =
      reanimated::createReanimatedModuleProxy(_nodesManager, _moduleRegistry, rnRuntime, jsCallInvoker, workletsModule);

  auto &uiRuntime = [workletsModule getWorkletsModuleProxy]->getUIWorkletRuntime() -> getJSIRuntime();

  RNRuntimeDecorator::decorate(rnRuntime, uiRuntime, reanimatedModuleProxy);
  [self attachReactEventListener:reanimatedModuleProxy];

  react_native_assert(_surfacePresenter != nil && "_surfacePresenter is nil");
  RCTScheduler *scheduler = [_surfacePresenter scheduler];
  react_native_assert(scheduler != nil && "_surfacePresenter.scheduler is nil");
  react_native_assert(scheduler.uiManager != nil && "_surfacePresenter.scheduler.uiManager is nil");
  const auto &uiManager = scheduler.uiManager;
  react_native_assert(uiManager.get() != nil);
  reanimatedModuleProxy->initializeFabric(uiManager);

  return @YES;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  [self checkBridgeless];
  REAAssertJavaScriptQueue();
  return std::make_shared<facebook::react::NativeReanimatedModuleSpecJSI>(params);
}

@end
