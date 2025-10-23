#ifdef WORKLETS_BUNDLE_MODE
/*
 * This file is based on RCTNetworking.h from React Native.
 */

#import <React/RCTNetworking.h>

using namespace facebook;

@interface WorkletsNetworking : NSObject
- (instancetype)init:(RCTNetworking *)rctNetworking;

- (void)jsiSendRequest:(jsi::Runtime &)rt
                jquery:(const jsi::Value &)jquery
        responseSender:(jsi::Function &&)responseSender;

- (void)jsiAbortRequest:(double)requestID;

- (void)jsiClearCookies:(jsi::Runtime &)rt responseSender:(jsi::Function &&)responseSender;

@end
#endif // WORKLETS_BUNDLE_MODE
