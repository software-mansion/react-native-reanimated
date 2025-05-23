#import <React/RCTCallInvokerModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTInvalidating.h>

#import <rnworklets/rnworklets.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>

#ifdef WORKLETS_EXPERIMENTAL_BUNDLING
#import <React/NSBigStringBuffer.h>
#import <React/RCTBundleConsumer.h>
#endif // WORKLETS_EXPERIMENTAL_BUNDLING

@interface WorkletsModule : RCTEventEmitter <
                                NativeWorkletsModuleSpec,
                                RCTCallInvokerModule,
                                RCTInvalidating
#ifdef WORKLETS_EXPERIMENTAL_BUNDLING
                                ,
                                RCTBundleConsumer
#endif // WORKLETS_EXPERIMENTAL_BUNDLING
                                >

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

@end
