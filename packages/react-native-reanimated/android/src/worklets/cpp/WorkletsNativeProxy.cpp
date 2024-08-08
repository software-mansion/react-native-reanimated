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
#include "ReanimatedJSIUtils.h"
#include "ReanimatedRuntime.h"
#include "ReanimatedVersion.h"
#include "WorkletRuntime.h"
#include "WorkletRuntimeCollector.h"
#include "WorkletsNativeProxy.h"

namespace reanimated {

using namespace facebook;
using namespace react;

WorkletsNativeProxy::WorkletsNativeProxy(
    jni::alias_ref<WorkletsNativeProxy::javaobject> jThis,
    jsi::Runtime *rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
    const std::shared_ptr<reanimated::UIScheduler> &uiScheduler,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager,
#endif
    const std::string &valueUnpackerCode)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      commonWorkletsModule_(std::make_shared<reanimated::CommonWorkletsModule>(
          *rnRuntime,
          std::make_shared<reanimated::JSScheduler>(*rnRuntime, jsCallInvoker),
          std::make_shared<JMessageQueueThread>(messageQueueThread),
          uiScheduler,
          valueUnpackerCode,
          /* isBridgeless */ false,
          getIsReducedMotion())) {
#ifdef RCT_NEW_ARCH_ENABLED
  commonInit(fabricUIManager);
#endif // RCT_NEW_ARCH_ENABLED
}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
WorkletsNativeProxy::WorkletsNativeProxy(
    jni::alias_ref<WorkletsNativeProxy::javaobject> jThis,
    jsi::Runtime *rnRuntime,
    RuntimeExecutor runtimeExecutor,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    jni::global_ref<LayoutAnimations::javaobject> layoutAnimations,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager,
    const std::string &valueUnpackerCode)
    : javaPart_(jni::make_global(jThis)),
      rnRuntime_(rnRuntime),
      nativeReanimatedModule_(std::make_shared<NativeReanimatedModule>(
          *rnRuntime,
          std::make_shared<JSScheduler>(*rnRuntime, runtimeExecutor),
          std::make_shared<JMessageQueueThread>(messageQueueThread),
          uiScheduler,
          getPlatformDependentMethods(),
          valueUnpackerCode,
          /* isBridgeless */ true,
          getIsReducedMotion())),
      layoutAnimations_(std::move(layoutAnimations)) {
  commonInit(fabricUIManager);
}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

#ifdef RCT_NEW_ARCH_ENABLED
void WorkletsNativeProxy::commonInit(
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        &fabricUIManager) {
  const auto &uiManager =
      fabricUIManager->getBinding()->getScheduler()->getUIManager();
  nativeReanimatedModule_->initializeFabric(uiManager);
  // removed temporarily, event listener mechanism needs to be fixed on RN side
  // eventListener_ = std::make_shared<EventListener>(
  //     [nativeReanimatedModule,
  //      getAnimationTimestamp](const RawEvent &rawEvent) {
  //       return nativeReanimatedModule->handleRawEvent(
  //           rawEvent, getAnimationTimestamp());
  //     });
  // reactScheduler_ = binding->getScheduler();
  // reactScheduler_->addEventListener(eventListener_);
}
#endif // RCT_NEW_ARCH_ENABLED

jni::local_ref<WorkletsNativeProxy::jhybriddata>
WorkletsNativeProxy::initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder,
    jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager,
#endif
    const std::string &valueUnpackerCode) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto uiScheduler = androidUiScheduler->cthis()->getUIScheduler();
  return makeCxxInstance(
      jThis,
      (jsi::Runtime *)jsContext,
      jsCallInvoker,
      uiScheduler,
      messageQueueThread,
#ifdef RCT_NEW_ARCH_ENABLED
      fabricUIManager,
#endif
      valueUnpackerCode);
}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
jni::local_ref<WorkletsNativeProxy::jhybriddata>
WorkletsNativeProxy::initHybridBridgeless(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutorHolder,
    jni::alias_ref<AndroidUIScheduler::javaobject> androidUiScheduler,
    jni::alias_ref<LayoutAnimations::javaobject> layoutAnimations,
    jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager,
    const std::string &valueUnpackerCode) {
  auto uiScheduler = androidUiScheduler->cthis()->getUIScheduler();
  auto runtimeExecutor = runtimeExecutorHolder->cthis()->get();
  return makeCxxInstance(
      jThis,
      (jsi::Runtime *)jsContext,
      runtimeExecutor,
      uiScheduler,
      make_global(layoutAnimations),
      messageQueueThread,
      fabricUIManager,
      valueUnpackerCode);
}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

void WorkletsNativeProxy::installJSIBindings() {
  jsi::Runtime &rnRuntime = *rnRuntime_;
  reanimated::WorkletRuntimeCollector::install(rnRuntime);
}

bool WorkletsNativeProxy::getIsReducedMotion() {
  static const auto method = getJniMethod<jboolean()>("getIsReducedMotion");
  return method(javaPart_.get());
}

void WorkletsNativeProxy::registerNatives() {
  registerHybrid({
    makeNativeMethod("initHybrid", WorkletsNativeProxy::initHybrid),
#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
        makeNativeMethod(
            "initHybridBridgeless", WorkletsNativeProxy::initHybridBridgeless),
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
        makeNativeMethod(
            "installJSIBindings", WorkletsNativeProxy::installJSIBindings)
  });
}
} // namespace reanimated