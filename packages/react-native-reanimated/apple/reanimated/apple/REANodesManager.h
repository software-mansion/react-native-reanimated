#import <React/RCTEventDispatcherProtocol.h>
#import <React/RCTSurfacePresenter.h>

#import <reanimated/LayoutAnimations/LayoutAnimationConfig.h>
#import <reanimated/LayoutAnimations/NativeLayoutAnimation.h>
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
- (void)runCoreAnimationForView:(ReactTag)viewTag
                   initialFrame:(const facebook::react::Rect &)initialFrame
                     animations:(const std::vector<reanimated::NativeLayoutAnimation> &)animations
                         config:
                             (const reanimated::LayoutAnimationRawConfig &)
                                 config // TODO: Pass also the animation type, create some potentially new abstraction
                                        // for handling different animations and run it from the NodesManager, something
                                        // like CALayoutAnimator.animateEntering, CALayoutAnimator.animateExiting etc.?
           usePresentationLayer:(bool)usePresentationLayer
                     completion:(std::function<void(bool)>)completion;
//                   animationKey:(NSString *)animationKey;

@end
