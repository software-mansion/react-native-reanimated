#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/IOSUIScheduler.h>
#import <worklets/apple/WorkletsMessageThread.h>
#import <worklets/apple/WorkletsModule.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTCallInvoker.h>

using worklets::RNRuntimeWorkletDecorator;
using worklets::WorkletsModuleProxy;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation WorkletsModule {
  AnimationFrameQueue *animationFrameQueue_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
#ifndef NDEBUG
  worklets::SingleInstanceChecker<WorkletsModule> singleInstanceChecker_;
#endif // NDEBUG
}

- (std::shared_ptr<WorkletsModuleProxy>)getWorkletsModuleProxy
{
  AssertJavaScriptQueue();
  return workletsModuleProxy_;
}

- (void)checkBridgeless
{
  auto isBridgeless = ![self.bridge isKindOfClass:[RCTCxxBridge class]];
  react_native_assert(isBridgeless && "[Worklets] react-native-worklets only supports bridgeless mode");
}

RCT_EXPORT_MODULE(WorkletsModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  // TODO: remove this method
  return @YES;
}

- (void)installJSIBindingsWithRuntime:(facebook::jsi::Runtime &)rnRuntime
                          callInvoker:(const std::shared_ptr<facebook::react::CallInvoker> &)jsCallInvoker
{
  react_native_assert(self.bridge != nullptr);
  [self checkBridgeless];

  AssertJavaScriptQueue();

  auto jsQueue = std::make_shared<WorkletsMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

  auto jsScheduler = std::make_shared<worklets::JSScheduler>(rnRuntime, jsCallInvoker);
  auto uiScheduler = std::make_shared<worklets::IOSUIScheduler>();
  animationFrameQueue_ = [AnimationFrameQueue new];
  auto forwardedRequestAnimationFrame = std::function<void(std::function<void(const double)>)>(
      [animationFrameQueue = animationFrameQueue_](std::function<void(const double)> callback) {
        [animationFrameQueue requestAnimationFrame:callback];
      });
  workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(
      rnRuntime, jsQueue, jsCallInvoker, jsScheduler, uiScheduler, std::move(forwardedRequestAnimationFrame));
  RNRuntimeWorkletDecorator::decorate(rnRuntime, workletsModuleProxy_);
}

- (void)invalidate
{
  AssertTurboModuleManagerQueue();

  [animationFrameQueue_ invalidate];

  // We have to destroy extra runtimes when invalidate is called. If we clean
  // it up later instead there's a chance the runtime will retain references
  // to invalidated memory and will crash on destruction.
  workletsModuleProxy_.reset();

  [super invalidate];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  [self checkBridgeless];
  AssertJavaScriptQueue();
  return std::make_shared<facebook::react::NativeWorkletsModuleSpecJSI>(params);
}

@end
