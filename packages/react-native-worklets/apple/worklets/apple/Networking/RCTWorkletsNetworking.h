

// #import <React/RCTBridgeProxy.h>
// #import <React/RCTEventEmitter.h>
// #import <React/RCTNetworkTask.h>
#import <React/RCTNetworking.h>
// #import <React/RCTURLRequestHandler.h>

#import <worklets/WorkletRuntime/RuntimeManager.h>

@interface RCTWorkletsNetworking : NSObject

- (instancetype)init:(std::shared_ptr<worklets::RuntimeManager>)runtimeManager
       rctNetworking:(RCTNetworking *)rctNetworking;

- (void)JSIsendRequest:(facebook::jsi::Runtime &)rt
                jquery:(const facebook::jsi::Value &)jquery
        responseSender:(const facebook::jsi::Function &)responseSender;

@end
