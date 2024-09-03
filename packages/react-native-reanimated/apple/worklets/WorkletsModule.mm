#import <React/RCTBridge+Private.h>

#ifdef RCT_NEW_ARCH_ENABLED
#if REACT_NATIVE_MINOR_VERSION < 73
#import <React/RCTRuntimeExecutorFromBridge.h>
#endif // REACT_NATIVE_MINOR_VERSION < 73
#import <RNReanimated/REAInitializerRCTFabricSurface.h>
#endif // RCT_NEW_ARCH_ENABLED

#import <RNReanimated/REAIOSUIScheduler.h>
#import <RNReanimated/REAMessageThread.h>
#import <RNReanimated/REANodesManager.h>
#import <RNReanimated/REAUIKit.h>
#import <RNReanimated/RNRuntimeDecorator.h>
#import <RNReanimated/ReanimatedJSIUtils.h>
#import <RNReanimated/SingleInstanceChecker.h>
#import <RNReanimated/WorkletRuntime.h>
#import <RNReanimated/WorkletRuntimeCollector.h>
#import <RNReanimated/WorkletsModule.h>

using namespace facebook::react;
using namespace reanimated;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@interface RCTBridge (RCTTurboModule)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
- (void)_tryAndHandleError:(dispatch_block_t)block;
@end

@implementation WorkletsModule {
#ifndef NDEBUG
  SingleInstanceChecker<REAModule> singleInstanceChecker_;
#endif // NDEBUG
  std::shared_ptr<NativeWorkletsModule> NativeWorkletsModule_;
  bool _isBridgeless;
}

- (std::shared_ptr<NativeWorkletsModule>)getNativeWorkletsModule
{
  return NativeWorkletsModule_;
}

@synthesize moduleRegistry = _moduleRegistry;

RCT_EXPORT_MODULE(WorkletsModule);

- (void)invalidate
{
  [super invalidate];
}

- (dispatch_queue_t)methodQueue
{
  // This module needs to be on the same queue as the UIManager to avoid
  // having to lock `_operations` and `_preOperations` since `uiManagerWillPerformMounting`
  // will be called from that queue.
  return RCTGetUIManagerQueue();
}

- (void)setBridge:(RCTBridge *)bridge
{
  [super setBridge:bridge];
#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  _isBridgeless = true;
#else
  _isBridgeless = false;
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
}

- (BOOL)isBridgeless
{
  return _isBridgeless;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule : (nonnull NSString *)valueUnpackerCode)
{
#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;
  auto &rnRuntime = *(jsi::Runtime *)cxxBridge.runtime;
#else
  facebook::jsi::Runtime *jsiRuntime = [self.bridge respondsToSelector:@selector(runtime)]
      ? reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime)
      : nullptr;
  auto &rnRuntime = *jsiRuntime;
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

  std::shared_ptr<UIScheduler> uiScheduler = std::make_shared<REAIOSUIScheduler>();
  std::shared_ptr<JSScheduler> jsScheduler = std::make_shared<JSScheduler>(rnRuntime, self.bridge.jsCallInvoker);
  auto jsQueue = std::make_shared<REAMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

  NativeWorkletsModule_ = std::make_shared<NativeWorkletsModule>(
      rnRuntime, jsScheduler, jsQueue, uiScheduler, std::string([valueUnpackerCode UTF8String]), _isBridgeless);

  return @YES;
}

@end
