#import <React/RCTBridge.h>
#import <React/RCTCallInvoker.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/WorkletsModule.h>

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@interface RCTBridge (RCTTurboModule)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
- (void)_tryAndHandleError:(dispatch_block_t)block;
@end

@implementation WorkletsModule {
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
  auto *bridge = self.bridge;
  auto &rnRuntime = *(jsi::Runtime *)bridge.runtime;
  nativeWorkletsModule_ = std::make_shared<NativeWorkletsModule>(std::string([valueUnpackerCode UTF8String]));
  RNRuntimeWorkletDecorator::decorate(rnRuntime, nativeWorkletsModule_);

  return @YES;
}

@end
