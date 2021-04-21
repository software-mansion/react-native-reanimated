#include <memory>
#include <string>

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/ReadableNativeArray.h>
#include <react/jni/ReadableNativeMap.h>
#include <jsi/JSIDynamic.h>

#include "NativeProxy.h"
#include "PlatformDepMethodsHolder.h"
#include <cxxreact/NativeToJsBridge.h>

#include <cxxreact/MessageQueueThread.h>
#include <cxxreact/SystraceSection.h>
#include <hermes/hermes.h>
#include <jsi/decorator.h>

#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>

#include <jsi/JSCRuntime.h>

namespace reanimated
{

class RuntimeProvider {
public:
  static std::shared_ptr<jsi::Runtime> createRuntime(
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread, 
    bool isDebug, 
    int runtimeType
  );
};

}
