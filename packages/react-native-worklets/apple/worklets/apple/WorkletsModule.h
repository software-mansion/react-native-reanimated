#import <React/RCTBridgeModule.h>
#import <React/RCTCallInvokerModule.h>
#import <React/RCTInitializing.h>
#import <React/RCTInvalidating.h>

#import <rnworklets/rnworklets.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>

@interface WorkletsModule : NSObject <NativeWorkletsModuleSpec, RCTCallInvokerModule, RCTInitializing, RCTInvalidating>

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

@end
