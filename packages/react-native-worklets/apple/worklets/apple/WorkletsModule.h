#import <React/RCTEventEmitter.h>
#import <React/RCTInvalidating.h>
#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>

#import <rnworklets/rnworklets.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>

@interface WorkletsModule : RCTEventEmitter <NativeWorkletsModuleSpec, RCTTurboModuleWithJSIBindings, RCTInvalidating>

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

@end
