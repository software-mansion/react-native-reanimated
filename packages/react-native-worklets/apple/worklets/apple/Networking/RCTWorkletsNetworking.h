#import <React/RCTNetworking.h>

#import <worklets/WorkletRuntime/RuntimeManager.h>

@interface RCTWorkletsNetworking : NSObject

- (instancetype)init:(std::shared_ptr<worklets::RuntimeManager>)runtimeManager
       rctNetworking:(RCTNetworking *)rctNetworking;

- (void)sendRequest:(jsi::Runtime &)rt
                jquery:(const jsi::Value &)jquery
        responseSender:(jsi::Function &&)responseSender;

- (void)abortRequest:(jsi::Runtime &)rt requestID:(double)requestID;

- (void)clearCookies:(jsi::Runtime &)rt
      responseSender:
(jsi::Function &&)responseSender;

@end
