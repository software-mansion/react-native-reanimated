#import <React/RCTCallInvokerModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTInvalidating.h>

#import <rnworklets/rnworklets.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>

#ifdef WORKLETS_EXPERIMENTAL_BUNDLING
#import <ReactCommon/NSBigStringBuffer.h>
#endif // WORKLETS_EXPERIMENTAL_BUNDLING

@interface WorkletsModule : RCTEventEmitter <NativeWorkletsModuleSpec, RCTCallInvokerModule, RCTInvalidating>

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

#ifdef WORKLETS_EXPERIMENTAL_BUNDLING
- (void)setScriptBuffer:(NSBigStringBuffer *)script;
#endif // WORKLETS_EXPERIMENTAL_BUNDLING

- (void)setSourceURL:(const std::string &)sourceURL;

@end
