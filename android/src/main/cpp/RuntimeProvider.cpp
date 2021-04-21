#include "RuntimeProvider.h"

#include <hermes/hermes.h>
#include <jsi/JSCRuntime.h>

namespace reanimated
{

std::shared_ptr<jsi::Runtime> RuntimeProvider::createRuntime(
  jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread, 
  bool isDebug, 
  int runtimeType
) {
  switch(runtimeType) {

    case 1: {
      return jsc::makeJSCRuntime();
    } break;

    default: {
      std::shared_ptr<jsi::Runtime> runtimeShared;
      std::unique_ptr<facebook::hermes::HermesRuntime> runtime = facebook::hermes::makeHermesRuntime();
      if(isDebug) {
        auto jsQueue = std::make_shared<JMessageQueueThread>(messageQueueThread);
        SystraceSection s("RuntimeProvider::createRuntime");
        facebook::hermes::HermesRuntime &hermesRuntimeRef = *runtime;
        auto adapter = std::make_unique<HermesExecutorRuntimeAdapter>(std::move(runtime), hermesRuntimeRef, jsQueue);
        std::shared_ptr<jsi::Runtime> runtimeShared = adapter->runtime_;
        facebook::hermes::inspector::chrome::enableDebugging(std::move(adapter), "Reanimated Runtime");
      }
      else {
        runtimeShared = std::move(runtime);
      }
      return runtimeShared;
    }

  }
}

}
