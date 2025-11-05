#import <React/RCTCallInvokerModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTInvalidating.h>

#import <rnworklets/rnworklets.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>

#if __has_include(<React/RCTBundleConsumer.h>)
// Bundle mode
#import <React/NSBigStringBuffer.h>
#import <React/RCTBundleConsumer.h>
#endif // __has_include(<React/RCTBundleConsumer.h>)

@interface WorkletsModule : RCTEventEmitter <
                                NativeWorkletsModuleSpec,
                                RCTCallInvokerModule,
                                RCTInvalidating
#if __has_include(<React/RCTBundleConsumer.h>)
                                // Bundle mode
                                ,
                                RCTBundleConsumer
#endif // __has_include(<React/RCTBundleConsumer.h>)
                                >

- (std::shared_ptr<worklets::WorkletsModuleProxy>)getWorkletsModuleProxy;

@end
