#import <React/RCTCallInvokerModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTInvalidating.h>
#import <ReactCommon/NSBigStringBuffer.h>

#import <rnworklets/rnworklets.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>

@interface WorkletsModule : RCTEventEmitter <NativeWorkletsModuleSpec, RCTCallInvokerModule, RCTInvalidating>

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

- (void)setScriptBuffer:(NSBigStringBuffer *)script;

- (void)setSourceURL:(const std::string &)sourceURL;

@end
