#import <React/RCTEventDispatcherProtocol.h>

#import <reanimated/apple/READisplayLink.h>
#import <React/RCTSurfacePresenter.h>

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

- (void)registerPerformOperations:(REAPerformOperations)performOperations;
- (void)maybeFlushUIUpdatesQueue;

@end
