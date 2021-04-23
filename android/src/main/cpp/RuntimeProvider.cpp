#include "RuntimeProvider.h"

#include <hermes/hermes.h>

namespace reanimated
{

std::shared_ptr<jsi::Runtime> RuntimeProvider::createRuntime(
  JavaScriptExecutorHolder* javaScriptExecutor,
  jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread, 
  bool isDebug, 
  int runtimeType
) {
  
  if(runtimeType == 1) { // JSC, V8
    std::shared_ptr<ExecutorDelegate> delegate = std::shared_ptr<ExecutorDelegate>();
    auto jsQueue = std::make_shared<JMessageQueueThread>(messageQueueThread);
    factory = javaScriptExecutor->getExecutorFactory();
    executor = factory.get()->createJSExecutor(delegate, jsQueue);
    std::shared_ptr<jsi::Runtime> runtimeShared;
    runtimeShared.reset(static_cast<jsi::Runtime*>(executor.get()->getJavaScriptContext()));
    return runtimeShared;
  }

  // Hermes
  std::shared_ptr<jsi::Runtime> runtimeShared;
  std::unique_ptr<facebook::hermes::HermesRuntime> runtime = facebook::hermes::makeHermesRuntime();
  if(isDebug) {
    auto jsQueue = std::make_shared<JMessageQueueThread>(messageQueueThread);
    SystraceSection s("RuntimeProvider::createRuntime");
    facebook::hermes::HermesRuntime &hermesRuntimeRef = *runtime;
    auto adapter = std::make_unique<HermesExecutorRuntimeAdapter>(std::move(runtime), hermesRuntimeRef, jsQueue);
    runtimeShared = adapter->runtime_;
    facebook::hermes::inspector::chrome::enableDebugging(std::move(adapter), "Reanimated Runtime");
  }
  else {
    runtimeShared = std::move(runtime);
  }
  return runtimeShared; 
}

}
