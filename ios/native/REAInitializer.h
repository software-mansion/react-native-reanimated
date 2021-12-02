//
//  REAInitializer.h
//  RNReanimated
//
//  Created by Szymon Kapala on 27/07/2021.
//

#import <Foundation/Foundation.h>
#import <RNReanimated/NativeProxy.h>
#import <RNReanimated/REAEventDispatcher.h>
#import <RNReanimated/REAModule.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#import <ReactCommon/RCTTurboModuleManager.h>

NS_ASSUME_NONNULL_BEGIN

namespace reanimated {

using namespace facebook;
using namespace react;

JSIExecutor::RuntimeInstaller REAJSIExecutorRuntimeInstaller(
    RCTBridge *bridge,
    JSIExecutor::RuntimeInstaller runtimeInstallerToWrap);

} // namespace reanimated
NS_ASSUME_NONNULL_END
