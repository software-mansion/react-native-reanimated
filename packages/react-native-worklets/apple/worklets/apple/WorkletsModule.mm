#import <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/Tools/WorkletsJSIUtils.h>
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

#if __has_include(<React/RCTBundleConsumer.h>)
// Bundle mode
@synthesize scriptBuffer = scriptBuffer_;
@synthesize sourceURL = sourceURL_;
#endif // __has_include(<React/RCTBundleConsumer.h>)

- (void)checkBridgeless
{
  auto isBridgeless = ![self.bridge isKindOfClass:[RCTCxxBridge class]];
  react_native_assert(isBridgeless && "[Worklets] react-native-worklets only supports bridgeless mode");
}

@synthesize callInvoker = _callInvoker;

RCT_EXPORT_MODULE(WorkletsModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  react_native_assert(self.bridge != nullptr);
  [self checkBridgeless];
  react_native_assert(self.bridge.runtime != nullptr);

  AssertJavaScriptQueue();

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);

  auto jsQueue = std::make_shared<WorkletsMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });

  std::string sourceURL = "";
  std::shared_ptr<const BigStringBuffer> script = nullptr;
#ifdef WORKLETS_BUNDLE_MODE
  script = [scriptBuffer_ getBuffer];
  sourceURL = [sourceURL_ UTF8String];
#endif // WORKLETS_BUNDLE_MODE

  auto jsCallInvoker = _callInvoker.callInvoker;
  auto uiScheduler = std::make_shared<worklets::IOSUIScheduler>();
  auto isJavaScriptQueue = []() -> bool { return IsJavaScriptQueue(); };
  animationFrameQueue_ = [AnimationFrameQueue new];
  auto forwardedRequestAnimationFrame = std::function<void(std::function<void(const double)>)>(
      [animationFrameQueue = animationFrameQueue_](std::function<void(const double)> callback) {
        [animationFrameQueue requestAnimationFrame:callback];
      });
  workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(
      rnRuntime,
      jsQueue,
      jsCallInvoker,
      uiScheduler,
      std::move(isJavaScriptQueue),
      std::move(forwardedRequestAnimationFrame),
      script,
      sourceURL);
  auto jsiWorkletsModuleProxy = workletsModuleProxy_->createJSIWorkletsModuleProxy();
  auto optimizedJsiWorkletsModuleProxy = worklets::jsi_utils::optimizedFromHostObject(
      rnRuntime, std::static_pointer_cast<jsi::HostObject>(std::move(jsiWorkletsModuleProxy)));
  RNRuntimeWorkletDecorator::decorate(
      rnRuntime, std::move(optimizedJsiWorkletsModuleProxy), workletsModuleProxy_->getJSLogger());

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

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  [self checkBridgeless];
  AssertJavaScriptQueue();
  return std::make_shared<facebook::react::NativeWorkletsModuleSpecJSI>(params);
}

@end
