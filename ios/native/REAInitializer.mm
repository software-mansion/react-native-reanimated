#ifndef RCT_NEW_ARCH_ENABLED

#import <RNReanimated/REAInitializer.h>

namespace reanimated {

#if REACT_NATIVE_MINOR_VERSION <= 71

JSIExecutor::RuntimeInstaller REAJSIExecutorRuntimeInstaller(
    RCTBridge *bridge,
    JSIExecutor::RuntimeInstaller runtimeInstallerToWrap)
{
  return runtimeInstallerToWrap;
}

#endif // REACT_NATIVE_MINOR_VERSION <= 71

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
