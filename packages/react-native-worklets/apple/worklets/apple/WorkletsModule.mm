#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/Tools/WorkletsJSIUtils.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/IOSUIScheduler.h>
#import <worklets/apple/WorkletsMessageThread.h>
#import <worklets/apple/WorkletsModule.h>
#import <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#import <worklets/Tools/Types.h>
#import <worklets/apple/Networking/RCTWorkletsNetworking.h>

#import <ReactCommon/RCTTurboModule.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTCallInvoker.h>
#import <React/RCTNetworking.h>

#import <FBReactNativeSpec/FBReactNativeSpec.h>

using worklets::RNRuntimeWorkletDecorator;
using worklets::WorkletsModuleProxy;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation WorkletsModule {
  AnimationFrameQueue *animationFrameQueue_;
  std::shared_ptr<WorkletsModuleProxy> workletsModuleProxy_;
  RCTNetworking *networkingModule_;
  RCTWorkletsNetworking *workletsNetworking_;
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

@synthesize callInvoker = callInvoker_;
@synthesize moduleRegistry = moduleRegistry_;

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

  networkingModule_ = [moduleRegistry_ moduleForClass:RCTNetworking.class];

  std::string sourceURL = "";
  std::shared_ptr<const BigStringBuffer> script = nullptr;
#ifdef WORKLETS_BUNDLE_MODE
  script = [scriptBuffer_ getBuffer];
  sourceURL = [sourceURL_ UTF8String];
#endif // WORKLETS_BUNDLE_MODE

  auto jsCallInvoker = callInvoker_.callInvoker;
  auto uiScheduler = std::make_shared<worklets::IOSUIScheduler>();
  workletsNetworking_ = [[RCTWorkletsNetworking alloc] init:uiScheduler rctNetworking:networkingModule_];
  
  worklets::forwardedFetch forwardedSendRequest = [workletsNetworking = workletsNetworking_](jsi::Runtime &rt, const jsi::Value& request, const jsi::Value& responseSender){
    auto responser = responseSender.asObject(rt).asFunction(rt);
    [workletsNetworking JSIsendRequest:rt jquery:request responseSender:responser];
  };
  
  auto isJavaScriptQueue = []() -> bool { return IsJavaScriptQueue(); };
  animationFrameQueue_ = [AnimationFrameQueue new];
  auto forwardedRequestAnimationFrame = std::function<void(std::function<void(const double)>)>(
      [animationFrameQueue = animationFrameQueue_](std::function<void(const double)> callback) {
        [animationFrameQueue requestAnimationFrame:callback];
      });

//  worklets::forwardedFetch forwardedFetch = //std::function<void(jsi::Runtime rt, jsi::Value request, jsi::Value callback)>(
//                                                                                                      
//    [networkingModule = networkingModule_](jsi::Runtime &rt, const jsi::Value &requestData, const jsi::Value &callback) {
//      
//      auto requestDataObject = requestData.asObject(rt);
//      
//      auto requestDataKeys = requestDataObject.getPropertyNames(rt);
//      
////      NSData *HTTPBody;
//      for(int i = 0; i<requestDataKeys.size(rt); i++) {
//        LOG(INFO) << requestDataKeys.getValueAtIndex(rt, i).asString(rt).utf8(rt);
//      }
//      
//      auto url = requestDataObject.getProperty(rt, "url").asString(rt).utf8(rt);
//      
//      auto method = requestDataObject.getProperty(rt, "method").asString(rt).utf8(rt);
//      
//      id objCobj = facebook::react::TurboModuleConvertUtils::convertJSIValueToObjCObject(rt, requestData, nullptr);
//      
//      
////
//      NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:objCobj[@"url"]]];
//      
//      request.HTTPMethod = objCobj[@"method"];
//      
//      
////      NSURLRequest *request = [NSURLRequest requestWithURL:[NSURL URLWithString:[NSString stringWithUTF8String:url.c_str()]]];
////      request
////      request.HTTPBody =
//      RCTNetworkTask *task = [networkingModule networkTaskWithRequest:request completionBlock:^(NSURLResponse *response, NSData *data, NSError *error) {
//        if (error) {
////          callback(error.localizedDescription.UTF8String);
//          callback.asObject(rt).asFunction(rt).call(rt, facebook::react::TurboModuleConvertUtils::convertObjCObjectToJSIValue(rt, error));
//        } else {
////          callback([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding].UTF8String);
//          
////          [RCTNetworking decode
//          
////          callback.asObject(rt).asFunction(rt).call(rt, facebook::react::TurboModuleConvertUtils::convertObjCObjectToJSIValue(rt, response));
//          auto sstring = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding].UTF8String;
//          
//          auto stringResponse = jsi::String::createFromUtf8(rt, sstring);
//          
//          callback.asObject(rt).asFunction(rt).call(rt, stringResponse);
//        }
//      }];
//      [task start];
//    };
  //);
    
  workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(
      rnRuntime,
      jsQueue,
      jsCallInvoker,
      uiScheduler,
      std::move(isJavaScriptQueue),
      std::move(forwardedRequestAnimationFrame),
      std::move(forwardedSendRequest),
      script,
      sourceURL);
  auto jsiWorkletsModuleProxy = workletsModuleProxy_->createJSIWorkletsModuleProxy();
  auto optimizedJsiWorkletsModuleProxy =
  worklets::jsi_utils::optimizedFromHostObject(rnRuntime,std::dynamic_pointer_cast<jsi::HostObject>(std::move(jsiWorkletsModuleProxy)));
  RNRuntimeWorkletDecorator::decorate(rnRuntime, std::move(optimizedJsiWorkletsModuleProxy));

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
