#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTCallInvokerModule.h>
#import <rnreanimated/rnreanimated.h>
#else // RCT_NEW_ARCH_ENABLED
#import <React/RCTBridgeModule.h>
#endif // RCT_NEW_ARCH_ENABLED
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

#import <reanimated/apple/LayoutReanimation/REAAnimationsManager.h>
#import <reanimated/apple/REANodesManager.h>

@interface REAModule : RCTEventEmitter
#ifdef RCT_NEW_ARCH_ENABLED
                       <NativeReanimatedModuleSpec,
                        RCTCallInvokerModule,
#else
                       <RCTBridgeModule,
#endif // RCT_NEW_ARCH_ENABLED
                        RCTEventDispatcherObserver,
                        RCTUIManagerObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;
@property REAAnimationsManager *animationsManager;

#ifdef RCT_NEW_ARCH_ENABLED
- (void)installReanimatedAfterReload;
#endif // RCT_NEW_ARCH_ENABLED

@end
