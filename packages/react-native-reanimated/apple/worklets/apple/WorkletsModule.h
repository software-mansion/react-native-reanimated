#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <worklets/NativeModules/WorkletsModuleProxy.h>

@interface WorkletsModule : RCTEventEmitter <RCTBridgeModule>

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

@end
