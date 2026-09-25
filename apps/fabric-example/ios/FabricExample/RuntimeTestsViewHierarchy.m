#if RUNTIME_TESTS

#import <React/RCTBridgeModule.h>

@interface RuntimeTestsViewHierarchy : NSObject <RCTBridgeModule>
@end

@implementation RuntimeTestsViewHierarchy

@synthesize viewRegistry_DEPRECATED = _viewRegistry_DEPRECATED;

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

// Reads the Fabric component view registry, which holds a view from its Create until its Delete mutation.
RCT_EXPORT_METHOD(isViewMounted : (nonnull NSNumber *)tag resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)
{
  BOOL mounted = [_viewRegistry_DEPRECATED viewForReactTag:tag] != nil;
  resolve(@(mounted));
}

@end

#endif
