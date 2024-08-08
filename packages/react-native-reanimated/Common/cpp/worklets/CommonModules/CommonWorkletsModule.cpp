#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#if REACT_NATIVE_MINOR_VERSION >= 73 && defined(RCT_NEW_ARCH_ENABLED)
#include <react/utils/CoreFeatures.h>
#endif
#endif

#include <functional>
#include <iomanip>
#include <sstream>
#include <thread>
#include <unordered_map>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/scheduler/Scheduler.h>
#include "ReanimatedCommitShadowNode.h"
#include "ShadowTreeCloner.h"
#endif

#include "AsyncQueue.h"
#include "CollectionUtils.h"
#include "EventHandlerRegistry.h"
#include "RNRuntimeWorkletDecorator.h"
#include "Shareables.h"
#include "WorkletEventHandler.h"

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

CommonWorkletsModule::CommonWorkletsModule(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::string &valueUnpackerCode,
    const bool isBridgeless,
    const bool isReducedMotion)
    : CommonWorkletsModuleSpec(
          isBridgeless ? nullptr : jsScheduler->getJSCallInvoker()),
      isBridgeless_(isBridgeless),
      isReducedMotion_(isReducedMotion),
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

void CommonWorkletsModule::commonInit(jsi::Runtime &rnRuntime) {
  RNRuntimeWorkletDecorator::decorate(
      rnRuntime, std::shared_ptr<CommonWorkletsModule>(this));
}

CommonWorkletsModule::~CommonWorkletsModule() {
  uiWorkletRuntime_.reset();
}

void CommonWorkletsModule::scheduleOnUI(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt, worklet, "[Reanimated] Only worklets can be scheduled to run on UI.");
  uiScheduler_->scheduleOnUI([=] {
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

jsi::Value CommonWorkletsModule::executeOnUIRuntimeSync(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  return uiWorkletRuntime_->executeSync(rt, worklet);
}

jsi::Value CommonWorkletsModule::createWorkletRuntime(
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

jsi::Value CommonWorkletsModule::scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &shareableWorkletValue) {
  reanimated::scheduleOnRuntime(rt, workletRuntimeValue, shareableWorkletValue);
  return jsi::Value::undefined();
}

jsi::Value CommonWorkletsModule::makeShareableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  return reanimated::makeShareableClone(
      rt, value, shouldRetainRemote, nativeStateSource);
}

} // namespace reanimated
