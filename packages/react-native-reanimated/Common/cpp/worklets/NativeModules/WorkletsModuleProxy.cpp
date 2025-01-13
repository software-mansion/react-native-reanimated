#include <string>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/Defs.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <jsi/jsi.h>

// Standard `__cplusplus` macro reference:
// https://en.cppreference.com/w/cpp/preprocessor/replace#Predefined_macros
#if REACT_NATIVE_MINOR_VERSION >= 75 || __cplusplus >= 202002L
// Implicit copy capture of `this` is deprecated in NDK27, which uses C++20.
#define COPY_CAPTURE_WITH_THIS [ =, this ] // NOLINT (whitespace/braces)
#else
// React Native 0.75 is the last one which allows NDK23. NDK23 uses C++17 and
// explicitly disallows C++20 features, including the syntax above. Therefore we
// fallback to the deprecated syntax here.
#define COPY_CAPTURE_WITH_THIS [=] // NOLINT (whitespace/braces)
#endif // REACT_NATIVE_MINOR_VERSION >= 75 || __cplusplus >= 202002L

using namespace facebook;

namespace worklets {

WorkletsModuleProxy::WorkletsModuleProxy(
    jsi::Runtime &rnRuntime,
    const std::string &valueUnpackerCode,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler)
    : WorkletsModuleProxySpec(jsCallInvoker),
      valueUnpackerCode_(valueUnpackerCode),
      jsQueue_(jsQueue),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      uiWorkletRuntime_(std::make_shared<WorkletRuntime>(
          rnRuntime,
          jsQueue,
          jsScheduler,
          "Reanimated UI runtime",
          true /* supportsLocking */,
          valueUnpackerCode_)) {}

WorkletsModuleProxy::~WorkletsModuleProxy() {
  // We need an exclusive lock to make sure nothing can be scheduled on the UI
  // during the destructor invocation.
  uiWorkletRuntimeMutex_.lock();

  isValid_ = false;
  jsQueue_->quitSynchronous();
  uiWorkletRuntime_.reset();

  uiWorkletRuntimeMutex_.unlock();
}

jsi::Value WorkletsModuleProxy::makeShareableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  // TODO: It might be a good idea to rename one of these methods to avoid
  // confusion.
  return worklets::makeShareableClone(
      rt, value, shouldRetainRemote, nativeStateSource);
}

void WorkletsModuleProxy::scheduleOnUI(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  // We need a shared lock here to make sure the UI runtime is not being
  // destroyed while we are scheduling worklets on it.
  uiWorkletRuntimeMutex_.lock_shared();
  if (!isValid_) {
    return;
  }

  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt, worklet, "[Worklets] Only worklets can be scheduled to run on UI.");
  uiScheduler_->scheduleOnUI(COPY_CAPTURE_WITH_THIS {
#if JS_RUNTIME_HERMES
    // JSI's scope defined here allows for JSI-objects to be cleared up
    // after each runtime loop. Within these loops we typically create some
    // temporary JSI objects and hence it allows for such objects to be
    // garbage collected much sooner. Apparently the scope API is only
    // supported on Hermes at the moment.
    const auto scope = jsi::Scope(*uiWorkletRuntime_->getJSIRuntime());
#endif
    uiWorkletRuntime_->runGuarded(shareableWorklet);

    uiWorkletRuntimeMutex_.unlock_shared();
  });
}

jsi::Value WorkletsModuleProxy::executeOnUIRuntimeSync(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  return uiWorkletRuntime_->executeSync(rt, worklet);
}

jsi::Value WorkletsModuleProxy::createWorkletRuntime(
    jsi::Runtime &rt,
    const jsi::Value &name,
    const jsi::Value &initializer) {
  auto workletRuntime = std::make_shared<WorkletRuntime>(
      rt,
      jsQueue_,
      jsScheduler_,
      name.asString(rt).utf8(rt),
      false /* supportsLocking */,
      valueUnpackerCode_);
  auto initializerShareable = extractShareableOrThrow<ShareableWorklet>(
      rt, initializer, "[Reanimated] Initializer must be a worklet.");
  workletRuntime->runGuarded(initializerShareable);
  return jsi::Object::createFromHostObject(rt, workletRuntime);
}

jsi::Value WorkletsModuleProxy::scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &shareableWorkletValue) {
  worklets::scheduleOnRuntime(rt, workletRuntimeValue, shareableWorkletValue);
  return jsi::Value::undefined();
}

} // namespace worklets
