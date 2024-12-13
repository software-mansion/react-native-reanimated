#import <React/RCTBridge+Private.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/WorkletsMessageThread.h>
#import <worklets/apple/WorkletsModule.h>
#import <worklets/tools/SingleInstanceChecker.h>

using worklets::RNRuntimeWorkletDecorator;
using worklets::WorkletsModuleProxy;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@interface RCTBridge (RCTTurboModule)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
- (void)_tryAndHandleError:(dispatch_block_t)block;
@end

@implementation WorkletsModule {
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
#ifndef NDEBUG
  worklets::SingleInstanceChecker<WorkletsModule> singleInstanceChecker_;
#endif // NDEBUG
}

- (std::shared_ptr<WorkletsModuleProxy>)getWorkletsModuleProxy
{
  return workletsModuleProxy_;
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
  workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(std::string([valueUnpackerCode UTF8String]), jsQueue);
  RNRuntimeWorkletDecorator::decorate(rnRuntime, workletsModuleProxy_);

  return @YES;
}

@end
