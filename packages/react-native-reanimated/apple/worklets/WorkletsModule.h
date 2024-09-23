#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTInitializing.h>
#if REACT_NATIVE_MINOR_VERSION >= 74
#import <React/RCTRuntimeExecutorModule.h>
#import <ReactCommon/RCTRuntimeExecutor.h>
#endif // REACT_NATIVE_MINOR_VERSION >= 74
#import <rnreanimated/rnreanimated.h>
#else // RCT_NEW_ARCH_ENABLED
#import <React/RCTBridgeModule.h>
#endif // RCT_NEW_ARCH_ENABLED
#import <RNReanimated/NativeWorkletsModule.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

using namespace reanimated;

@interface WorkletsModule : RCTEventEmitter <RCTBridgeModule>

- (std::shared_ptr<NativeWorkletsModule>)getNativeWorkletsModule;

@end
