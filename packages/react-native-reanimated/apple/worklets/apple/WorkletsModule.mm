#import <React/RCTBridge+Private.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/WorkletsMessageThread.h>
#import <worklets/apple/WorkletsModule.h>

using worklets::NativeWorkletsModule;
using worklets::RNRuntimeWorkletDecorator;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@interface RCTBridge (RCTTurboModule)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
- (void)_tryAndHandleError:(dispatch_block_t)block;
@end

@implementation WorkletsModule {
  std::shared_ptr<NativeWorkletsModule> nativeWorkletsModule_;
}

- (std::shared_ptr<NativeWorkletsModule>)getNativeWorkletsModule
{
  return nativeWorkletsModule_;
}

@synthesize moduleRegistry = _moduleRegistry;

RCT_EXPORT_MODULE(WorkletsModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule : (nonnull NSString *)valueUnpackerCode)
{
  auto *bridge = self.bridge;
  auto &rnRuntime = *(jsi::Runtime *)bridge.runtime;
  auto jsQueue = std::make_shared<WorkletsMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });
  nativeWorkletsModule_ = std::make_shared<NativeWorkletsModule>(std::string([valueUnpackerCode UTF8String]), jsQueue);
  RNRuntimeWorkletDecorator::decorate(rnRuntime, nativeWorkletsModule_);

  return @YES;
}

@end
