#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/IOSUIScheduler.h>
#import <worklets/apple/WorkletsMessageThread.h>
#import <worklets/apple/WorkletsModule.h>
#import <React/NSDataBigString.h>

#import <React/RCTCallInvoker.h>

using worklets::RNRuntimeWorkletDecorator;
using worklets::WorkletsModuleProxy;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation WorkletsModule {
  AnimationFrameQueue *animationFrameQueue_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
  std::unique_ptr<NSDataBigString> bundle_;
#ifndef NDEBUG
  worklets::SingleInstanceChecker<WorkletsModule> singleInstanceChecker_;
#endif // NDEBUG
}

- (std::shared_ptr<WorkletsModuleProxy>)getWorkletsModuleProxy
{
  AssertJavaScriptQueue();
  return workletsModuleProxy_;
}

- (void)setBundleString:(NSData*) bundle {
  bundle_ = std::make_unique<NSDataBigString>(bundle);
}

@synthesize callInvoker = _callInvoker;

RCT_EXPORT_MODULE(WorkletsModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  AssertJavaScriptQueue();

  react_native_assert(self.bridge != nullptr);
  react_native_assert(self.bridge.runtime != nullptr);
  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);

  auto jsQueue = std::make_shared<WorkletsMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

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
      jsQueue,
      jsCallInvoker,
      jsScheduler,
      uiScheduler);
  workletsModuleProxy_->init(rnRuntime, std::move(forwardedRequestAnimationFrame), std::move(bundle_));
  RNRuntimeWorkletDecorator::decorate(rnRuntime, workletsModuleProxy_);

  return @YES;
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

@end
