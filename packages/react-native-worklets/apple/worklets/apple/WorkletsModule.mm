#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/IOSUIScheduler.h>
#import <worklets/apple/WorkletsMessageThread.h>
#import <worklets/apple/WorkletsModule.h>

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

@synthesize callInvoker = _callInvoker;

RCT_EXPORT_MODULE(WorkletsModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule : (nonnull NSString *)valueUnpackerCode)
{
  AssertJavaScriptQueue();

  auto *bridge = self.bridge;
  auto &rnRuntime = *(jsi::Runtime *)bridge.runtime;
  auto jsQueue = std::make_shared<WorkletsMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

  std::string valueUnpackerCodeStr = [valueUnpackerCode UTF8String];
  auto jsCallInvoker = _callInvoker.callInvoker;
  auto jsScheduler = std::make_shared<worklets::JSScheduler>(rnRuntime, jsCallInvoker);
  auto uiScheduler = std::make_shared<worklets::IOSUIScheduler>();
  animationFrameQueue_ = [AnimationFrameQueue new];
  auto forwardedRequestAnimationFrame = std::function<void(std::function<void(const double)>)>(
      [animationFrameQueue = animationFrameQueue_](std::function<void(const double)> callback) {
        [animationFrameQueue requestAnimationFrame:callback];
      });
  workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(
      rnRuntime,
      valueUnpackerCodeStr,
      jsQueue,
      jsCallInvoker,
      jsScheduler,
      uiScheduler,
      std::move(forwardedRequestAnimationFrame));
  RNRuntimeWorkletDecorator::decorate(rnRuntime, workletsModuleProxy_);

  return @YES;
}

- (void)invalidate
{
  // Called on com.meta.react.turbomodulemanager.queue

  [animationFrameQueue_ invalidate];

  // We have to destroy extra runtimes when invalidate is called. If we clean
  // it up later instead there's a chance the runtime will retain references
  // to invalidated memory and will crash on destruction.
  workletsModuleProxy_.reset();

  [super invalidate];
}

@end
