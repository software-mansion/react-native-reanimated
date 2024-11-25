#include <android/log.h>
#include <fbjni/fbjni.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/ReadableNativeArray.h>
#include <react/jni/ReadableNativeMap.h>
#ifdef RCT_NEW_ARCH_ENABLED
#include <react/fabric/Binding.h>
#endif

#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/android/WorkletsModule.h>

namespace worklets {

using namespace facebook;
using namespace react;

WorkletsModule::WorkletsModule(
    jni::alias_ref<WorkletsModule::javaobject> jThis,
    jsi::Runtime *rnRuntime,
    const std::string &valueUnpackerCode,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      nativeWorkletsModule_(std::make_shared<NativeWorkletsModule>(
          valueUnpackerCode,
          std::make_shared<JMessageQueueThread>(messageQueueThread))) {
  RNRuntimeWorkletDecorator::decorate(*rnRuntime_, nativeWorkletsModule_);
}

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    const std::string &valueUnpackerCode,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread) {
  return makeCxxInstance(
      jThis, (jsi::Runtime *)jsContext, valueUnpackerCode, messageQueueThread);
}

void WorkletsModule::registerNatives() {
  registerHybrid({makeNativeMethod("initHybrid", WorkletsModule::initHybrid)});
}

} // namespace worklets
