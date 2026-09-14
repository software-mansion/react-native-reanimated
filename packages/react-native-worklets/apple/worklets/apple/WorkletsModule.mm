#import <worklets/NativeModules/WorkletsModuleProxyInitializer.h>
#import <worklets/Tools/JSScheduler.h>
#import <worklets/Tools/RNRuntimeStatus.h>
#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/WorkletRuntime/BundleModeConfig.h>
#import <worklets/WorkletRuntime/RuntimeBindings.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/IOSUIScheduler.h>
#import <worklets/apple/ScriptLoader.h>
#import <worklets/apple/WorkletsModule.h>

#import <Foundation/Foundation.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTCallInvoker.h>

#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
#import <React/RCTNetworking.h>
#import <ReactCommon/RCTTurboModule.h>
#import <worklets/apple/Networking/WorkletsNetworking.h>
#endif // WORKLETS_FETCH_PREVIEW_ENABLED

#import <memory>
#import <string>

using namespace worklets;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

namespace {

BundleModeConfig makeBundleModeConfig(NSURL *bundleURL)
{
  return BundleModeConfig{
      .enabled = true,
      .script = getScript(bundleURL),
      .sourceURL = bundleURL != nil ? std::string([[bundleURL absoluteString] UTF8String]) : std::string{}};
}

} // namespace

@implementation WorkletsModule {
  AnimationFrameQueue *animationFrameQueue_;
  std::shared_ptr<IOSUIScheduler> uiScheduler_;
  std::shared_ptr<RNRuntimeStatus> rnRuntimeStatus_;
  std::shared_ptr<WorkletsModuleProxyInitializer> initializer_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
  WorkletsNetworking *workletsNetworking_;
#endif // WORKLETS_FETCH_PREVIEW_ENABLED
#ifndef NDEBUG
  SingleInstanceChecker<WorkletsModule> singleInstanceChecker_;
#endif // NDEBUG
}

- (std::shared_ptr<WorkletsModuleProxy>)getWorkletsModuleProxy
{
  AssertJavaScriptQueue();
  return workletsModuleProxy_;
}

@synthesize bridge = _bridge;
@synthesize bundleManager = bundleManager_;
@synthesize callInvoker = callInvoker_;
#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
@synthesize moduleRegistry = moduleRegistry_;
#endif // WORKLETS_FETCH_PREVIEW_ENABLED

RCT_EXPORT_MODULE(WorkletsModule);

- (void)initialize
{
  [self createPlatformObjects];
  [self createInitializer];

  const auto initializer = initializer_;
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{ initializer->prepareProxy(); });
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule : (BOOL)bundleModeEnabled)
{
  react_native_assert(self.bridge != nullptr);
  react_native_assert(self.bridge.runtime != nullptr);

  AssertJavaScriptQueue();

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);
  const auto bundleModeConfig =
      bundleModeEnabled ? makeBundleModeConfig(bundleManager_.bundleURL) : BundleModeConfig{.enabled = false};
  workletsModuleProxy_ = initializer_->finalize(rnRuntime, bundleModeConfig);
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
  if (initializer_) {
    initializer_->invalidate();
    initializer_.reset();
  }
  workletsModuleProxy_.reset();
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  AssertJavaScriptQueue();
  return std::make_shared<facebook::react::NativeWorkletsModuleSpecJSI>(params);
}

- (void)createPlatformObjects
{
  animationFrameQueue_ = [AnimationFrameQueue new];
  uiScheduler_ = std::make_shared<IOSUIScheduler>();
  rnRuntimeStatus_ = std::make_shared<RNRuntimeStatus>();
#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
  id networkingModule = [moduleRegistry_ moduleForClass:RCTNetworking.class];
  workletsNetworking_ = [[WorkletsNetworking alloc] init:networkingModule];
#endif // WORKLETS_FETCH_PREVIEW_ENABLED
}

- (void)createInitializer
{
  react_native_assert(self.bridge != nullptr);
  react_native_assert(self.bridge.runtime != nullptr);

  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);
  const auto jsScheduler =
      std::make_shared<JSScheduler>(rnRuntime, callInvoker_.callInvoker, []() -> bool { return IsJavaScriptQueue(); });
  initializer_ = std::make_shared<WorkletsModuleProxyInitializer>(
      jsScheduler, uiScheduler_, [self getRuntimeBindings], rnRuntimeStatus_);
}

- (std::shared_ptr<RuntimeBindings>)getRuntimeBindings
{
  return std::make_shared<RuntimeBindings>(RuntimeBindings{
      .requestAnimationFrame = [animationFrameQueue =
                                    animationFrameQueue_](std::function<void(const double)> &&callback) -> void {
        [animationFrameQueue requestAnimationFrame:callback];
      },
      .nativeLoggingHook = makeNativeLoggingHook()
#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
          ,
      .abortRequest =
          [workletsNetworking = workletsNetworking_](jsi::Runtime &rt, const jsi::Value &requestID) {
            [workletsNetworking jsiAbortRequest:requestID.asNumber()];
            return jsi::Value::undefined();
          },
      .clearCookies =
          [workletsNetworking = workletsNetworking_](jsi::Runtime &rt, jsi::Function &&responseSender) {
            [workletsNetworking jsiClearCookies:rt responseSender:(std::move(responseSender))];
            return jsi::Value::undefined();
          },
      .sendRequest =
          [workletsNetworking = workletsNetworking_](
              jsi::Runtime &rt, const jsi::Value &query, jsi::Function &&responseSender) {
            [workletsNetworking jsiSendRequest:rt jquery:query responseSender:(std::move(responseSender))];
            return jsi::Value::undefined();
          }
#endif // WORKLETS_FETCH_PREVIEW_ENABLED
  });
}

@end
