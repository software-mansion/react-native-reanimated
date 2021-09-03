#import <Foundation/Foundation.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <RNReanimated/NativeProxy.h>
#import <RNReanimated/REAModule.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <RNReanimated/REAEventDispatcher.h>
#import <jsireact/JSIExecutor.h>

#if RNVERSION >= 64
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#endif

#if RNVERSION < 63
#import <ReactCommon/BridgeJSCallInvoker.h>
#endif

NS_ASSUME_NONNULL_BEGIN

namespace reanimated {

using namespace facebook;
using namespace react;

JSIExecutor::RuntimeInstaller REAJSIExecutorRuntimeInstaller(
    RCTBridge* bridge,
    JSIExecutor::RuntimeInstaller runtimeInstallerToWrap
);

}
NS_ASSUME_NONNULL_END
