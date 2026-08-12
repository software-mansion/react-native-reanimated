#import <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#import <worklets/Tools/RNRuntimeStatus.h>
#import <worklets/Tools/ScriptBuffer.h>
#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/IOSUIScheduler.h>
#import <worklets/apple/ScriptLoader.h>
#import <worklets/apple/WorkletsModule.h>

#import <Foundation/Foundation.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTCallInvoker.h>

using namespace worklets;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation WorkletsModule {
  AnimationFrameQueue *animationFrameQueue_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
  std::shared_ptr<RNRuntimeStatus> rnRuntimeStatus_;
#ifndef NDEBUG
  SingleInstanceChecker<WorkletsModule> singleInstanceChecker_;
#endif // NDEBUG
}

- (std::shared_ptr<WorkletsModuleProxy>)getWorkletsModuleProxy
{
  AssertJavaScriptQueue();
  return workletsModuleProxy_;
}

@synthesize bundleManager = bundleManager_;
@synthesize callInvoker = callInvoker_;

RCT_EXPORT_MODULE(WorkletsModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule : (BOOL)bundleModeEnabled)
{
  react_native_assert(self.bridge != nullptr);
  react_native_assert(self.bridge.runtime != nullptr);

  AssertJavaScriptQueue();

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);

  std::string sourceURL = "";
  std::shared_ptr<const ScriptBuffer> script = nullptr;

  if (bundleModeEnabled) {
    NSURL *url = bundleManager_.bundleURL;
    script = getScript(url);
    sourceURL = [[url absoluteString] UTF8String];
  }

  auto jsCallInvoker = callInvoker_.callInvoker;
  auto uiScheduler = std::make_shared<IOSUIScheduler>();
  auto isJavaScriptQueue = []() -> bool {
    return IsJavaScriptQueue();
  };
  animationFrameQueue_ = [AnimationFrameQueue new];
  auto runtimeBindings = [self getRuntimeBindings:rnRuntime bundleModeEnabled:bundleModeEnabled];
  rnRuntimeStatus_ = std::make_shared<RNRuntimeStatus>();

  workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(
      rnRuntime,
      jsCallInvoker,
      uiScheduler,
      std::move(isJavaScriptQueue),
      runtimeBindings,
      BundleModeConfig{.enabled = static_cast<bool>(bundleModeEnabled), .script = script, .sourceURL = sourceURL},
      rnRuntimeStatus_);

  return @YES;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(start)
{
  AssertJavaScriptQueue();
  workletsModuleProxy_->start();
  return @YES;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(toggleSlowAnimationsOnUIRuntime)
{
  throw std::runtime_error("[Worklets] toggleSlowAnimationsOnUIRuntime is not supported on iOS.");
}

- (void)invalidate
{
  AssertTurboModuleManagerQueue();

  [animationFrameQueue_ invalidate];

  if (rnRuntimeStatus_) {
    rnRuntimeStatus_->setDead();
  }
  workletsModuleProxy_.reset();

  [super invalidate];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  AssertJavaScriptQueue();
  return std::make_shared<facebook::react::NativeWorkletsModuleSpecJSI>(params);
}

- (std::shared_ptr<RuntimeBindings>)getRuntimeBindings:(jsi::Runtime &)rnRuntime
                                     bundleModeEnabled:(BOOL)bundleModeEnabled
{
  return std::make_shared<RuntimeBindings>(RuntimeBindings{
      .requestAnimationFrame = [animationFrameQueue =
                                    animationFrameQueue_](std::function<void(const double)> &&callback) -> void {
        [animationFrameQueue requestAnimationFrame:callback];
      },
      .nativeLoggingHook =
          bundleModeEnabled ? extractNativeLoggingHookFromRNRuntime(rnRuntime) : RuntimeBindings::NativeLoggingHook{}});
}

@end
