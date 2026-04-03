#import <React/RCTEventDispatcherProtocol.h>
#import <React/RCTSurfacePresenter.h>

#import <reanimated/apple/READisplayLink.h>
#import <reanimated/apple/REAUIView.h>

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
- (void)registerPerformOperations:(REAPerformOperations)performOperations;
- (void)maybeFlushUIUpdatesQueue;

// Pseudo-selector deferred attach - used when the native view is not yet in
// RCTComponentViewRegistry at the time attachPseudoSelector is called.
// The block is called with the view once it appears after a mounting transaction.
// selectorInt is the raw int value of the PseudoSelector C++ enum (0=active, 1=focus, 2=hover).
- (void)addPendingPseudoSelectorAttach:(void (^)(REAUIView *view))attachBlock
                                forTag:(int)tag
                           selectorInt:(int)selectorInt;
- (void)removePendingPseudoSelectorAttach:(int)tag selectorInt:(int)selectorInt;

@end
