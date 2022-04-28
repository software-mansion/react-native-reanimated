#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTSurfacePresenterStub.h>
#import <React/RCTUIManager.h>

@class REAModule;

typedef void (^REAOnAnimationCallback)(CADisplayLink *displayLink);
typedef void (^REANativeAnimationOp)(RCTUIManager *uiManager);
typedef void (^REAEventHandler)(NSString *eventName, id<RCTEvent> event);
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
- (void)operationsBatchDidComplete;

- (void)setSurfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter;

- (void)postOnAnimation:(REAOnAnimationCallback)clb;
- (void)postRunUpdatesAfterAnimation;
- (void)registerEventHandler:(REAEventHandler)eventHandler;
- (void)registerPerformOperations:(REAPerformOperations)performOperations;
- (void)enqueueUpdateViewOnNativeThread:(nonnull NSNumber *)reactTag
                               viewName:(NSString *)viewName
                            nativeProps:(NSMutableDictionary *)nativeProps
                       trySynchronously:(BOOL)trySync;

- (void)configureUiProps:(nonnull NSSet<NSString *> *)uiPropsSet
          andNativeProps:(nonnull NSSet<NSString *> *)nativePropsSet;

- (void)synchronouslyUpdateViewOnUIThread:(nonnull NSNumber *)viewTag props:(nonnull NSDictionary *)uiProps;

- (NSString *)obtainProp:(nonnull NSNumber *)viewTag propName:(nonnull NSString *)propName;
- (void)dispatchEvent:(id<RCTEvent>)event;
- (void)maybeFlushUpdateBuffer;

@end
