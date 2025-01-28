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
  jsQueue_->quitSynchronous();
  uiWorkletRuntime_.reset();
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
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt, worklet, "[Worklets] Only worklets can be scheduled to run on UI.");
  uiScheduler_->scheduleOnUI([shareableWorklet, weakThis = weak_from_this()] {
    // This callback can outlive the WorkletsModuleProxy object during the
    // invalidation of React Native. This happens when WorkletsModuleProxy
    // destructor is called on the JS thread and the UI thread is executing
    // callbacks from the `scheduleOnUI` queue. Therefore, we need to
    // make sure it's still alive before we try to access it.
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto uiWorkletRuntime = strongThis->getUIWorkletRuntime();

#if JS_RUNTIME_HERMES
    // JSI's scope defined here allows for JSI-objects to be cleared up
    // after each runtime loop. Within these loops we typically create some
    // temporary JSI objects and hence it allows for such objects to be
    // garbage collected much sooner. Apparently the scope API is only
    // supported on Hermes at the moment.
    const auto scope = jsi::Scope(uiWorkletRuntime->getJSIRuntime());
#endif // JS_RUNTIME_HERMES

    uiWorkletRuntime->runGuarded(shareableWorklet);
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
