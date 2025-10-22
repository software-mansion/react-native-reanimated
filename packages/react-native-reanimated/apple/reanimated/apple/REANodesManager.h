#import <React/RCTEventDispatcherProtocol.h>
#import <React/RCTSurfacePresenter.h>

#import <reanimated/apple/READisplayLink.h>

typedef void (^REAOnAnimationCallback)(READisplayLink *displayLink);
typedef void (^REAEventHandler)(id<RCTEvent> event);
typedef void (^CADisplayLinkOperation)(READisplayLink *displayLink);
typedef void (^REAPerformOperations)();

// TODO: Attempt to make it work with a Delegate for animation completion. No idea if this is correct
@interface REANodesManager : NSObject <CAAnimationDelegate>

@property (weak) RCTSurfacePresenter *surfacePresenter;
@property (nonatomic, copy) void (^pendingAnimationCompletion)(void);

- (nonnull instancetype)init;
- (void)invalidate;

- (void)postOnAnimation:(REAOnAnimationCallback)clb;
- (void)registerEventHandler:(REAEventHandler)eventHandler;
- (void)dispatchEvent:(id<RCTEvent>)event;
- (void)synchronouslyUpdateUIProps:(ReactTag)viewTag props:(const folly::dynamic &)props;
- (void)registerPerformOperations:(REAPerformOperations)performOperations;
- (void)maybeFlushUIUpdatesQueue;
- (void)runCoreAnimationForView:(ReactTag)viewTag
                       oldFrame:(const facebook::react::Rect &)oldFrame
                       newFrame:(const facebook::react::Rect &)newFrame
                     completion:(std::function<void()>)completion;

@end
