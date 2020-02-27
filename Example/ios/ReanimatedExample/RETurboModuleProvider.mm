
#import "RETurboModuleProvider.h"

#import <React/CoreModulesPlugins.h>
#import <ReactCommon/SampleTurboCxxModule.h>
#import <ReactCommon/RCTSampleTurboModule.h>
#import <NativeReanimatedModule.h>
#import <jsi/JSCRuntime.h>
#import "NativeProxy.h"

// NOTE: This entire file should be codegen'ed.

namespace facebook {
namespace react {

Class RETurboModuleClassProvider(const char *name) {
  return RCTCoreModulesClassProvider(name);
}

std::shared_ptr<TurboModule> RETurboModuleProvider(const std::string &name, std::shared_ptr<JSCallInvoker> jsInvoker) {
  if (name == "SampleTurboCxxModule") {
    return std::make_shared<SampleTurboCxxModule>(jsInvoker);
  }
  
  if (name == "NativeReanimated") {
    return NativeProxyWrapper::createNativeReanimatedModule(jsInvoker);
  }

  return nullptr;
}

std::shared_ptr<TurboModule> RETurboModuleProvider(const std::string &name,
                                                         id<RCTTurboModule> instance,
                                                         std::shared_ptr<JSCallInvoker> jsInvoker) {
  if (name == "SampleTurboModule") {
    return std::make_shared<NativeSampleTurboModuleSpecJSI>(instance, jsInvoker);
  }

  return nullptr;
}

} // namespace react
} // namespace facebook
