#import <worklets/Tools/SingleInstanceChecker.h>
#import <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/IOSUIScheduler.h>
#import <worklets/apple/WorkletsMessageThread.h>
#import <worklets/apple/WorkletsModule.h>
#import <react/RCTNetworking.h>

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
  RCTNetworking *networkingModule_;
#endif // NDEBUG
}

- (std::shared_ptr<WorkletsModuleProxy>)getWorkletsModuleProxy
{
  AssertJavaScriptQueue();
  return workletsModuleProxy_;
}

@synthesize callInvoker = callInvoker_;
@synthesize moduleRegistry = moduleRegistry_;

RCT_EXPORT_MODULE(WorkletsModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule : (nonnull NSString *)valueUnpackerCode)
{
  AssertJavaScriptQueue();

  react_native_assert(self.bridge != nullptr);
  react_native_assert(self.bridge.runtime != nullptr);
  jsi::Runtime &rnRuntime = *reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);

  auto jsQueue = std::make_shared<WorkletsMessageThread>([NSRunLoop currentRunLoop], ^(NSError *error) {
    throw error;
  });
  
  networkingModule_ = [moduleRegistry_ moduleForClass:RCTNetworking.class];
  // id request = [NSURLRequest requestWithURL:[NSURL URLWithString:@"https://tomekzaw.pl/ttss/"]];

  // RCTNetworkTask *task = [networkingModule_ networkTaskWithRequest:request completionBlock:^(NSURLResponse *response, NSData *data, NSError *error) {
  //   if (error) {
  //     NSLog(@"Error: %@", error);
  //   } else {
  //     NSLog(@"Response: %@", response);
  //   }
  // }];
  
  // [task start];
  
  

  std::string valueUnpackerCodeStr = [valueUnpackerCode UTF8String];
  auto jsCallInvoker = callInvoker_.callInvoker;
  auto jsScheduler = std::make_shared<worklets::JSScheduler>(rnRuntime, jsCallInvoker);
  auto uiScheduler = std::make_shared<worklets::IOSUIScheduler>();
  animationFrameQueue_ = [AnimationFrameQueue new];
  auto forwardedRequestAnimationFrame = std::function<void(std::function<void(const double)>)>(
      [animationFrameQueue = animationFrameQueue_](std::function<void(const double)> callback) {
        [animationFrameQueue requestAnimationFrame:callback];
      });
  auto forwardedFetch = std::function<void(std::string, std::string, std::function<void(std::string)>)>(
      [networkingModule = networkingModule_](std::string method, std::string url, std::function<void(std::string)> callback) {
        NSURLRequest *request = [NSURLRequest requestWithURL:[NSURL URLWithString:[NSString stringWithUTF8String:url.c_str()]]];
        RCTNetworkTask *task = [networkingModule networkTaskWithRequest:request completionBlock:^(NSURLResponse *response, NSData *data, NSError *error) {
          if (error) {
            callback(error.localizedDescription.UTF8String);
          } else {
            callback([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding].UTF8String);
          }
        }];
        [task start];
      });
  workletsModuleProxy_ = std::make_shared<WorkletsModuleProxy>(
      rnRuntime,
      valueUnpackerCodeStr,
      jsQueue,
      jsCallInvoker,
      jsScheduler,
      uiScheduler,
      std::move(forwardedRequestAnimationFrame),
      std::move(forwardedFetch));
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
