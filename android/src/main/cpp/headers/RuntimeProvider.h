#include <memory>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <jsi/JSIDynamic.h>
#include <cxxreact/NativeToJsBridge.h>
#include <cxxreact/MessageQueueThread.h>
#include <cxxreact/SystraceSection.h>
#include "NativeProxy.h"
#include <jsi/decorator.h>
#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>

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
