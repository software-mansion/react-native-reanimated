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
#import <RNReanimated/RNRuntimeWorkletDecorator.h>
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
  std::shared_ptr<NativeWorkletsModule> nativeWorkletsModule_;
  bool _isBridgeless;
}

- (std::shared_ptr<NativeWorkletsModule>)getNativeWorkletsModule
{
  return nativeWorkletsModule_;
}

@synthesize moduleRegistry = _moduleRegistry;

RCT_EXPORT_MODULE(WorkletsModule);

- (void)invalidate
{
  [super invalidate];
}

- (void)setBridge:(RCTBridge *)bridge
{
  [super setBridge:bridge];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule : (nonnull NSString *)valueUnpackerCode)
{
  RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;
  auto &rnRuntime = *(jsi::Runtime *)cxxBridge.runtime;
  nativeWorkletsModule_ = std::make_shared<NativeWorkletsModule>(std::string([valueUnpackerCode UTF8String]));
  RNRuntimeWorkletDecorator::decorate(rnRuntime, nativeWorkletsModule_);

  return @YES;
}

@end
