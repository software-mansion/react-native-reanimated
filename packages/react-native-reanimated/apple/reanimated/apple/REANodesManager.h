#import <React/RCTEventDispatcherProtocol.h>
#import <React/RCTSurfacePresenter.h>

#import <reanimated/apple/READisplayLink.h>

@class REAUIView;

typedef void (^REAOnAnimationCallback)(READisplayLink *displayLink);
typedef void (^REAEventHandler)(id<RCTEvent> event);
typedef void (^CADisplayLinkOperation)(READisplayLink *displayLink);
typedef void (^REAPerformOperations)();

@interface REANodesManager : NSObject

@property (weak) RCTSurfacePresenter *surfacePresenter;

- (nonnull instancetype)init;
- (void)invalidate;

- (void)postOnAnimation:(REAOnAnimationCallback)clb;
- (void)registerEventHandler:(REAEventHandler)eventHandler;
- (void)dispatchEvent:(id<RCTEvent>)event;
- (void)synchronouslyUpdateUIProps:(ReactTag)viewTag props:(const folly::dynamic &)props;
- (nullable REAUIView *)viewForTag:(ReactTag)viewTag;
- (void)registerPerformOperations:(REAPerformOperations)performOperations;
- (void)maybeFlushUIUpdatesQueue;
- (void)scheduleApplyCSSAnimationsForViewTag:(ReactTag)viewTag animations:(NSArray *)animations;
- (void)scheduleRemoveAllCSSAnimationsForViewTag:(ReactTag)viewTag;

@end
