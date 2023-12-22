#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTInitializing.h>
#import <rnreanimated/rnreanimated.h>
#else
#import <React/RCTBridgeModule.h>
#endif
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REANodesManager.h>

// needed to have CallInvoker import
#import <RNReanimated/WorkletRuntime.h>

@interface REAModule : RCTEventEmitter
#ifdef RCT_NEW_ARCH_ENABLED
                       <NativeReanimatedModuleSpec,
                        RCTInitializing,
#else
                       <RCTBridgeModule,
#endif
                        RCTEventDispatcherObserver,
                        RCTUIManagerObserver>

@property (nonatomic, readonly) REANodesManager *nodesManager;
@property REAAnimationsManager *animationsManager;

#ifdef RCT_NEW_ARCH_ENABLED
- (void)installReanimatedAfterReload;
- (void)installBridgelessWithRuntime:(jsi::Runtime *)jsiRuntime
                       jsCallInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker
                   valueUnpackerCode:(jsi::String)valueUnpackerCode;
#endif

@end
