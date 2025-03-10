#import <React/RCTEventDispatcherProtocol.h>

#import <reanimated/apple/READisplayLink.h>

@class ReanimatedModule;

typedef void (^REAOnAnimationCallback)(READisplayLink *displayLink);
typedef void (^REAEventHandler)(id<RCTEvent> event);
typedef void (^CADisplayLinkOperation)(READisplayLink *displayLink);
typedef void (^REAPerformOperations)();

@interface REANodesManager : NSObject

@property (nonatomic, weak, nullable) ReanimatedModule *reanimatedModule;

- (nonnull instancetype)initWithModule:(ReanimatedModule *)reanimatedModule;
- (void)invalidate;

- (void)postOnAnimation:(REAOnAnimationCallback)clb;
- (void)registerEventHandler:(REAEventHandler)eventHandler;
- (void)dispatchEvent:(id<RCTEvent>)event;

- (void)registerPerformOperations:(REAPerformOperations)performOperations;
- (void)maybeFlushUIUpdatesQueue;

@end
