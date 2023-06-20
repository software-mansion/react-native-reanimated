#ifndef RCT_NEW_ARCH_ENABLED

#import <RNReanimated/REAInitializer.h>
#import <RNReanimated/REAUIManager.h>

namespace reanimated {

void REAInitializer(RCTBridge *bridge)
{
  [bridge moduleForClass:[RCTUIManager class]];
  REAUIManager *reaUiManager = [REAUIManager new];
  [reaUiManager setBridge:bridge];
  RCTUIManager *uiManager = reaUiManager;
  [bridge updateModuleWithInstance:uiManager];
}

#if REACT_NATIVE_MINOR_VERSION <= 71

JSIExecutor::RuntimeInstaller REAJSIExecutorRuntimeInstaller(
    RCTBridge *bridge,
    JSIExecutor::RuntimeInstaller runtimeInstallerToWrap)
{
  REAInitializer(bridge);

  const auto runtimeInstaller = [runtimeInstallerToWrap](facebook::jsi::Runtime &runtime) {
    if (runtimeInstallerToWrap) {
      runtimeInstallerToWrap(runtime);
    }
  };
  return runtimeInstaller;
}

#endif // REACT_NATIVE_MINOR_VERSION <= 71

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
