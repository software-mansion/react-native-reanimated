#import <React/RCTCallInvokerModule.h>
#import <React/RCTEventEmitter.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>

@interface WorkletsModule : RCTEventEmitter <RCTCallInvokerModule>

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

@end
