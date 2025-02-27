#import <React/RCTBridge+Private.h>

#import <React/RCTCallInvoker.h>
#import <React/RCTFabricSurface.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurface.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <React/RCTSurfaceView.h>

#import <reanimated/RuntimeDecorators/RNRuntimeDecorator.h>
#import <reanimated/apple/REAModule.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REAUIKit.h>
#import <reanimated/apple/native/NativeProxy.h>

#import <worklets/Tools/ReanimatedJSIUtils.h>
#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/WorkletRuntime/WorkletRuntime.h>
#import <worklets/WorkletRuntime/WorkletRuntimeCollector.h>
#import <worklets/apple/WorkletsModule.h>

#if __has_include(<UIKit/UIAccessibility.h>)
#import <UIKit/UIAccessibility.h>
#endif // __has_include(<UIKit/UIAccessibility.h>)

using namespace facebook::react;
using namespace reanimated;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation REAModule {
  __weak RCTSurfacePresenter *_surfacePresenter;
#ifndef NDEBUG
  SingleInstanceChecker<REAModule> singleInstanceChecker_;
#endif // NDEBUG
  bool hasListeners;
}

@synthesize moduleRegistry = _moduleRegistry;
@synthesize callInvoker = _callInvoker;

RCT_EXPORT_MODULE(ReanimatedModule);

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (void)invalidate
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [_nodesManager invalidate];
  [super invalidate];
}

- (dispatch_queue_t)methodQueue
{
  // This module needs to be on the same queue as the UIManager to avoid
  // having to lock `_operations` and `_preOperations` since `uiManagerWillPerformMounting`
  // will be called from that queue.
  return RCTGetUIManagerQueue();
}

- (std::shared_ptr<UIManager>)getUIManager
{
  react_native_assert(_surfacePresenter != nil);
  RCTScheduler *scheduler = [_surfacePresenter scheduler];
  return scheduler.uiManager;
}

- (void)attachReactEventListener:(const std::shared_ptr<ReanimatedModuleProxy>)reanimatedModuleProxy
{
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
  _surfacePresenter = surfacePresenter;
}

- (void)setBridge:(RCTBridge *)bridge
{
  [super setBridge:bridge];
  _nodesManager = [[REANodesManager alloc] initWithModule:self bridge:bridge surfacePresenter:_surfacePresenter];
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

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  WorkletsModule *workletsModule = [_moduleRegistry moduleForName:"WorkletsModule"];
  auto jsCallInvoker = _callInvoker.callInvoker;
  auto jsiRuntime = reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);

  assert(jsiRuntime != nullptr);

  auto reanimatedModuleProxy =
      reanimated::createReanimatedModule(self, self.bridge, jsCallInvoker, workletsModule);

  auto &uiRuntime = [workletsModule getWorkletsModuleProxy]->getUIWorkletRuntime() -> getJSIRuntime();

  jsi::Runtime &rnRuntime = *jsiRuntime;
  WorkletRuntimeCollector::install(rnRuntime);
  RNRuntimeDecorator::decorate(rnRuntime, uiRuntime, reanimatedModuleProxy);
  [self attachReactEventListener:reanimatedModuleProxy];
  const auto &uiManager = [self getUIManager];
  react_native_assert(uiManager.get() != nil);
  reanimatedModuleProxy->initializeFabric(uiManager);

  return @YES;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeReanimatedModuleSpecJSI>(params);
}

@end
