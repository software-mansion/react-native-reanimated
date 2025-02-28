#import <React/RCTBridgeModule.h>
#import <React/RCTSurfacePresenterStub.h>
#import <React/RCTUIManager.h>

#import <reanimated/apple/READisplayLink.h>

@class REAModule;

typedef void (^REAOnAnimationCallback)(READisplayLink *displayLink);
typedef void (^REANativeAnimationOp)(RCTUIManager *uiManager);
typedef void (^REAEventHandler)(id<RCTEvent> event);
typedef void (^CADisplayLinkOperation)(READisplayLink *displayLink);
typedef void (^REAPerformOperations)();

@interface REANodesManager : NSObject

@property (nonatomic, weak, nullable) RCTUIManager *uiManager;
@property (nonatomic, weak, nullable) REAModule *reanimatedModule;
@property (nonatomic, readonly) CFTimeInterval currentAnimationTimestamp;

@property (nonatomic, nullable) NSSet<NSString *> *uiProps;
@property (nonatomic, nullable) NSSet<NSString *> *nativeProps;

- (nonnull instancetype)initWithModule:(REAModule *)reanimatedModule
                                bridge:(RCTBridge *)bridge
                      surfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter;
- (void)invalidate;

- (void)postOnAnimation:(REAOnAnimationCallback)clb;
- (void)registerEventHandler:(REAEventHandler)eventHandler;
- (void)dispatchEvent:(id<RCTEvent>)event;

- (void)registerPerformOperations:(REAPerformOperations)performOperations;
- (void)maybeFlushUIUpdatesQueue;

@end
