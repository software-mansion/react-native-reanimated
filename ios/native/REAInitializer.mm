#import "REAInitializer.h"

#import <React/CoreModulesPlugins.h>
#import <React/RCTDataRequestHandler.h>
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
#import <React/RCTFileRequestHandler.h>
#import <React/RCTGIFImageDecoder.h>
#import <React/RCTHTTPRequestHandler.h>
#import <React/RCTImageLoader.h>
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#import <React/RCTLocalAssetImageLoader.h>
#import <React/RCTNetworking.h>

#import "NativeProxy.h"

std::unique_ptr<facebook::react::JSExecutorFactory> REAAppSetupDefaultJsExecutorFactory(
    RCTBridge *bridge,
    RCTTurboModuleManager *turboModuleManager)
{
  // Necessary to allow NativeModules to lookup TurboModules
  [bridge setRCTTurboModuleRegistry:turboModuleManager];

#if RCT_DEV
  if (!RCTTurboModuleEagerInitEnabled()) {
    /**
     * Instantiating DevMenu has the side-effect of registering
     * shortcuts for CMD + d, CMD + i,  and CMD + n via RCTDevMenu.
     * Therefore, when TurboModules are enabled, we must manually create this
     * NativeModule.
     */
    [turboModuleManager moduleForName:"RCTDevMenu"];
  }
#endif

#if RCT_USE_HERMES
  return std::make_unique<facebook::react::HermesExecutorFactory>(
#else
  return std::make_unique<facebook::react::JSCExecutorFactory>(
#endif
      facebook::react::RCTJSIExecutorRuntimeInstaller([turboModuleManager, bridge](facebook::jsi::Runtime &runtime) {
        if (!bridge || !turboModuleManager) {
          return;
        }
        facebook::react::RuntimeExecutor syncRuntimeExecutor =
            [&](std::function<void(facebook::jsi::Runtime & runtime_)> &&callback) { callback(runtime); };
        [turboModuleManager installJSBindingWithRuntimeExecutor:syncRuntimeExecutor];

        // Reanimated
        auto reanimatedModule = reanimated::createReanimatedModule(bridge, bridge.jsCallInvoker);
        runtime.global().setProperty(
            runtime,
            "_WORKLET_RUNTIME",
            static_cast<double>(reinterpret_cast<std::uintptr_t>(reanimatedModule->runtime.get())));

        runtime.global().setProperty(
            runtime,
            jsi::PropNameID::forAscii(runtime, "__reanimatedModuleProxy"),
            jsi::Object::createFromHostObject(runtime, reanimatedModule));
      }));
}
