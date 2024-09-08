#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#if REACT_NATIVE_MINOR_VERSION >= 73
#include <react/utils/CoreFeatures.h>
#endif // REACT_NATIVE_MINOR_VERSION >= 73
#endif // RCT_NEW_ARCH_ENABLED

#include "NativeWorkletsModule.h"
#include "RNRuntimeWorkletDecorator.h"
#include "Shareables.h"

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif

#include <jsi/jsi.h>

using namespace facebook;

#if REACT_NATIVE_MINOR_VERSION == 73 && defined(RCT_NEW_ARCH_ENABLED)
// Android can't find the definition of this static field
bool CoreFeatures::useNativeState;
#endif

namespace reanimated {

NativeWorkletsModule::NativeWorkletsModule(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::string &valueUnpackerCode,
    const bool isBridgeless)
    : NativeWorkletsModuleSpec(jsScheduler->getJSCallInvoker()),
      isBridgeless_(isBridgeless),
      jsQueue_(jsQueue),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      uiWorkletRuntime_(std::make_shared<WorkletRuntime>(
          rnRuntime,
          jsQueue,
          jsScheduler_,
          "Reanimated UI runtime",
          true /* supportsLocking */,
          valueUnpackerCode)),
      valueUnpackerCode_(valueUnpackerCode),
      jsLogger_(std::make_shared<JSLogger>(jsScheduler_)) {
  commonInit(rnRuntime);
}

void NativeWorkletsModule::commonInit(jsi::Runtime &rnRuntime) {
  RNRuntimeWorkletDecorator::decorate(
      rnRuntime, std::shared_ptr<NativeWorkletsModule>(this));
}

NativeWorkletsModule::~NativeWorkletsModule() {
  uiWorkletRuntime_.reset();
}

void NativeWorkletsModule::scheduleOnUI(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt, worklet, "[Reanimated] Only worklets can be scheduled to run on UI.");
  uiScheduler_->scheduleOnUI([=, this] {
#if JS_RUNTIME_HERMES
    // JSI's scope defined here allows for JSI-objects to be cleared up after
    // each runtime loop. Within these loops we typically create some temporary
    // JSI objects and hence it allows for such objects to be garbage collected
    // much sooner.
    // Apparently the scope API is only supported on Hermes at the moment.
    const auto scope = jsi::Scope(uiWorkletRuntime_->getJSIRuntime());
#endif
    uiWorkletRuntime_->runGuarded(shareableWorklet);
  });
}

jsi::Value NativeWorkletsModule::executeOnUIRuntimeSync(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  return uiWorkletRuntime_->executeSync(rt, worklet);
}

jsi::Value NativeWorkletsModule::createWorkletRuntime(
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

jsi::Value NativeWorkletsModule::scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &shareableWorkletValue) {
  reanimated::scheduleOnRuntime(rt, workletRuntimeValue, shareableWorkletValue);
  return jsi::Value::undefined();
}

jsi::Value NativeWorkletsModule::makeShareableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  return reanimated::makeShareableClone(
      rt, value, shouldRetainRemote, nativeStateSource);
}

} // namespace reanimated
