#import <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#import <worklets/Tools/Defs.h>
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

#if __has_include(<React/RCTBundleProvider.h>)
// Bundle mode
#import <React/RCTBundleProvider.h>
#endif // __has_include(<React/RCTBundleProvider.h>)

using namespace worklets;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation WorkletsModule {
  AnimationFrameQueue *animationFrameQueue_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
#ifndef NDEBUG
  SingleInstanceChecker<WorkletsModule> singleInstanceChecker_;
#endif // NDEBUG
}

- (std::shared_ptr<WorkletsModuleProxy>)getWorkletsModuleProxy
{
  AssertJavaScriptQueue();
  return workletsModuleProxy_;
}

#if __has_include(<React/RCTBundleProvider.h>)
// Bundle mode
@synthesize bundleProvider = bundleProvider_;
#endif // __has_include(<React/RCTBundleProvider.h>)

- (void)checkBridgeless
{
  auto isBridgeless = ![self.bridge isKindOfClass:[RCTCxxBridge class]];
  react_native_assert(isBridgeless && "[Worklets] react-native-worklets only supports bridgeless mode");
}

@synthesize callInvoker = callInvoker_;

RCT_EXPORT_MODULE(WorkletsModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  react_native_assert(self.bridge != nullptr);
  [self checkBridgeless];
  react_native_assert(self.bridge.runtime != nullptr);

  AssertJavaScriptQueue();

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);

  auto jsQueue =
      std::make_shared<WorkletsMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) { throw error; });

  std::string sourceURL = "";
  std::shared_ptr<const JSBigStringBuffer> script = nullptr;
#ifdef WORKLETS_BUNDLE_MODE
  script = [bundleProvider_ getBundle];
  sourceURL = [[bundleProvider_ getSourceURL] UTF8String];
#endif // WORKLETS_BUNDLE_MODE

  auto jsCallInvoker = callInvoker_.callInvoker;
  auto uiScheduler = std::make_shared<IOSUIScheduler>();
  auto isJavaScriptQueue = []() -> bool {
    return IsJavaScriptQueue();
  };
  animationFrameQueue_ = [AnimationFrameQueue new];
  auto runtimeBindings = [self getRuntimeBindings];

  workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(
      rnRuntime, jsQueue, jsCallInvoker, uiScheduler, std::move(isJavaScriptQueue), runtimeBindings, script, sourceURL);
  auto jsiWorkletsModuleProxy = workletsModuleProxy_->createJSIWorkletsModuleProxy();
  auto optimizedJsiWorkletsModuleProxy = jsi_utils::optimizedFromHostObject(
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

- (RuntimeBindings)getRuntimeBindings
{
  return {
      .requestAnimationFrame = [animationFrameQueue =
                                    animationFrameQueue_](std::function<void(const double)> &&callback) -> void {
        [animationFrameQueue requestAnimationFrame:callback];
      }};
}

@end
