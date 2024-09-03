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

#include <memory>
#include <string>

#include "AndroidUIScheduler.h"
#include "WorkletRuntimeCollector.h"
#include "WorkletsModule.h"

namespace reanimated {

using namespace facebook;
using namespace react;

WorkletsModule::WorkletsModule(
    jni::alias_ref<WorkletsModule::javaobject> jThis,
    jsi::Runtime *rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<reanimated::UIScheduler> &uiScheduler,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    const std::string &valueUnpackerCode)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      NativeWorkletsModule_(std::make_shared<reanimated::NativeWorkletsModule>(
          *rnRuntime,
          std::make_shared<reanimated::JSScheduler>(*rnRuntime, jsCallInvoker),
          std::make_shared<JMessageQueueThread>(messageQueueThread),
          uiScheduler,
          valueUnpackerCode,
          /* isBridgeless */ false)) {}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
WorkletsModule::WorkletsModule(
    jni::alias_ref<WorkletsModule::javaobject> jThis,
    jsi::Runtime *rnRuntime,
    RuntimeExecutor runtimeExecutor,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    const std::string &valueUnpackerCode)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      NativeWorkletsModule_(std::make_shared<reanimated::NativeWorkletsModule>(
          *rnRuntime,
          std::make_shared<reanimated::JSScheduler>(
              *rnRuntime,
              runtimeExecutor),
          std::make_shared<JMessageQueueThread>(messageQueueThread),
          uiScheduler,
          valueUnpackerCode,
          /* isBridgeless */ true)) {}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

jni::local_ref<WorkletsModule::jhybriddata> WorkletsModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder,
    jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    const std::string &valueUnpackerCode) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto uiScheduler = androidUiScheduler->cthis()->getUIScheduler();
  return makeCxxInstance(
      jThis,
      (jsi::Runtime *)jsContext,
      jsCallInvoker,
      uiScheduler,
      messageQueueThread,
      valueUnpackerCode);
}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
jni::local_ref<WorkletsModule::jhybriddata>
WorkletsModule::initHybridBridgeless(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
    jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    const std::string &valueUnpackerCode) {
  auto uiScheduler = androidUiScheduler->cthis()->getUIScheduler();
  auto runtimeExecutor = runtimeExecutorHolder->cthis()->get();
  return makeCxxInstance(
      jThis,
      (jsi::Runtime *)jsContext,
      runtimeExecutor,
      uiScheduler,
      messageQueueThread,
      valueUnpackerCode);
}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

void WorkletsModule::installJSIBindings() {
  jsi::Runtime &rnRuntime = *rnRuntime_;
  reanimated::WorkletRuntimeCollector::install(rnRuntime);
}

void WorkletsModule::registerNatives() {
  registerHybrid({
    makeNativeMethod("initHybrid", WorkletsModule::initHybrid),
#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
        makeNativeMethod(
            "initHybridBridgeless", WorkletsModule::initHybridBridgeless),
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
        makeNativeMethod(
            "installJSIBindings", WorkletsModule::installJSIBindings)
  });
}
} // namespace reanimated
