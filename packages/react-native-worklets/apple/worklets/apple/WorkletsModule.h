#import <React/RCTCallInvokerModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTInvalidating.h>

#import <rnworklets/rnworklets.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>

@interface WorkletsModule : RCTEventEmitter <NativeWorkletsModuleSpec, RCTCallInvokerModule, RCTInvalidating>

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

@end
