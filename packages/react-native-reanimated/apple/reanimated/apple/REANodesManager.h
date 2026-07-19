#import <React/RCTEventDispatcherProtocol.h>
#import <React/RCTSurfacePresenter.h>

#import <reanimated/LayoutAnimations/LayoutAnimationConfig.h>
#import <reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h>
#import <reanimated/LayoutAnimations/NativeLayoutAnimationHandle.h>
#import <reanimated/apple/READisplayLink.h>

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
// Plays a generic, pre-sampled layout-animation descriptor via Core Animation.
- (void)runNativeLayoutAnimation:(reanimated::NativeLayoutAnimationHandle)handle
                      descriptor:(const reanimated::NativeLayoutAnimationDescriptor &)descriptor
            usePresentationLayer:(bool)usePresentationLayer
               cancellationToken:(reanimated::NativeLayoutAnimationCancellationToken)cancellationToken
                      completion:(std::function<void(bool)>)completion;
- (void)cancelNativeLayoutAnimation:(reanimated::NativeLayoutAnimationHandle)handle;

@end
