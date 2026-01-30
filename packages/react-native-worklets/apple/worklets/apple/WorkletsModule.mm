#import <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#import <worklets/Tools/Defs.h>
#import <worklets/Tools/ScriptBuffer.h>
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

#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
#import <FBReactNativeSpec/FBReactNativeSpec.h>
#import <React/RCTNetworking.h>
#import <ReactCommon/RCTTurboModule.h>
#import <worklets/apple/Networking/WorkletsNetworking.h>
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)

using namespace worklets;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation WorkletsModule {
  AnimationFrameQueue *animationFrameQueue_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
  WorkletsNetworking *workletsNetworking_;
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
#ifndef NDEBUG
  SingleInstanceChecker<WorkletsModule> singleInstanceChecker_;
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

@synthesize bundleManager = bundleManager_;
@synthesize callInvoker = callInvoker_;
#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
@synthesize moduleRegistry = moduleRegistry_;
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)

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
  std::shared_ptr<const ScriptBuffer> script = nullptr;
#ifdef WORKLETS_BUNDLE_MODE_ENABLED
#if defined(WORKLETS_FETCH_PREVIEW_ENABLED)
  id networkingModule = [moduleRegistry_ moduleForClass:RCTNetworking.class];
  workletsNetworking_ = [[WorkletsNetworking alloc] init:networkingModule];
#endif // defined(WORKLETS_FETCH_PREVIEW_ENABLED)
  NSURL *url = bundleManager_.bundleURL;
  NSData *data = [NSData dataWithContentsOfURL:url];
  if (data) {
    auto str = std::string(reinterpret_cast<const char *>([data bytes]), [data length]);
    auto bigString = std::make_shared<const JSBigStdString>(str);
    script = std::make_shared<const ScriptBuffer>(bigString);
  } else {
    NSString *errorMsg = [NSString stringWithFormat:@"[Worklets] Failed to load worklets bundle from URL: %@", url];
    NSLog(@"%@", errorMsg);
    throw std::runtime_error([errorMsg UTF8String]);
  }
  sourceURL = [[url absoluteString] UTF8String];
#endif // WORKLETS_BUNDLE_MODE_ENABLED

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

- (std::shared_ptr<RuntimeBindings>)getRuntimeBindings
{
  return std::make_shared<RuntimeBindings>(RuntimeBindings{
      .requestAnimationFrame = [animationFrameQueue =
                                    animationFrameQueue_](std::function<void(const double)> &&callback) -> void {
        [animationFrameQueue requestAnimationFrame:callback];
      }
#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
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
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
  });
}

@end
