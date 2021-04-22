#pragma once

#include <memory>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <cxxreact/NativeToJsBridge.h>
#include <cxxreact/MessageQueueThread.h>
#include <cxxreact/SystraceSection.h>
#include "NativeProxy.h"
#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>

namespace reanimated
{

class RuntimeProvider {
public:
  RuntimeProvider() {}
  ~RuntimeProvider() {}

  std::shared_ptr<JSExecutorFactory> factory;
  std::unique_ptr<JSExecutor> executor;

  std::shared_ptr<jsi::Runtime> createRuntime(
    JavaScriptExecutorHolder* javaScriptExecutor,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread, 
    bool isDebug, 
    int runtimeType
  );
  
};

}
