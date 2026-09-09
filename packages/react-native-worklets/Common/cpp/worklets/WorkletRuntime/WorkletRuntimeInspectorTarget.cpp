#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeInspectorTarget.h>

#include <cxxreact/ReactNativeVersion.h>
#include <jsinspector-modern/InspectorFlags.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

using namespace facebook::react::jsinspector_modern;

namespace {

/**
 * Looks up the DevSettings native module the same way TurboModuleRegistry does
 * in JavaScript: through `__turboModuleProxy` with the bridge and through
 * `nativeModuleProxy` in bridgeless mode.
 */
facebook::jsi::Value getDevSettingsModule(facebook::jsi::Runtime &rnRuntime) {
  const auto turboModuleProxy = rnRuntime.global().getProperty(rnRuntime, "__turboModuleProxy");
  if (turboModuleProxy.isObject() && turboModuleProxy.asObject(rnRuntime).isFunction(rnRuntime)) {
    return turboModuleProxy.asObject(rnRuntime).asFunction(rnRuntime).call(rnRuntime, "DevSettings");
  }
  const auto nativeModuleProxy = rnRuntime.global().getProperty(rnRuntime, "nativeModuleProxy");
  if (nativeModuleProxy.isObject()) {
    return nativeModuleProxy.asObject(rnRuntime).getProperty(rnRuntime, "DevSettings");
  }
  return facebook::jsi::Value::undefined();
}

} // namespace

bool WorkletRuntimeInspectorTarget::isInspectorEnabled() {
  return InspectorFlags::getInstance().getFuseboxEnabled();
}

WorkletRuntimeInspectorTarget::WorkletRuntimeInspectorTarget(
    bool isMainTarget,
    const std::string &runtimeName,
    const std::shared_ptr<facebook::jsi::Runtime> &runtime,
    facebook::hermes::HermesRuntime &hermesRuntime,
    const std::shared_ptr<std::recursive_mutex> &runtimeMutex,
    const std::shared_ptr<WorkletsInspectorConnection> &inspectorConnection,
    const std::shared_ptr<JSScheduler> &jsScheduler)
    : isMainTarget_(isMainTarget),
      runtimeName_(runtimeName),
      runtime_(runtime),
      hermesRuntime_(hermesRuntime),
      runtimeMutex_(runtimeMutex),
      inspectorConnection_(inspectorConnection),
      jsScheduler_(jsScheduler),
      pendingSetupJobs_(std::in_place) {}

WorkletRuntimeInspectorTarget::~WorkletRuntimeInspectorTarget() = default;

void WorkletRuntimeInspectorTarget::attach(const std::weak_ptr<WorkletRuntime> &weakWorkletRuntime) {
  runtimeTargetDelegate_ = makeRuntimeTargetDelegate();

  hostTarget_ = HostTarget::create(*this, inspectorConnection_->getExecutor());
  instanceTarget_ = &hostTarget_->registerInstance(*this);
  runtimeTarget_ = &instanceTarget_->registerRuntime(*runtimeTargetDelegate_, makeRuntimeExecutor(weakWorkletRuntime));

  flushSetupJobs();

  InspectorTargetCapabilities capabilities{.nativePageReloads = true};
#if REACT_NATIVE_VERSION_MINOR < 85
  capabilities.prefersFuseboxFrontend = true;
#endif // REACT_NATIVE_VERSION_MINOR < 85

  pageId_ = inspectorConnection_->addPage(
      isMainTarget_ ? WorkletsInspectorConnection::PageKind::Main : WorkletsInspectorConnection::PageKind::Child,
      isMainTarget_ ? "Worklet Runtimes" : "Worklet Runtime (" + runtimeName_ + ")",
      "Worklet Runtime (" + runtimeName_ + ")",
      [weakThis = weak_from_this()](std::unique_ptr<IRemoteConnection> remote) -> std::unique_ptr<ILocalConnection> {
        const auto strongThis = weakThis.lock();
        if (!strongThis || strongThis->detached_) {
          return nullptr;
        }
        return strongThis->hostTarget_->connect(std::move(remote));
      },
      capabilities);

  if (const auto workletRuntime = weakWorkletRuntime.lock()) {
    workletRuntime->schedule(
        [hermesRuntime = &hermesRuntime_](facebook::jsi::Runtime &) { hermesRuntime->registerForProfiling(); });
  }
}

void WorkletRuntimeInspectorTarget::detach(std::shared_ptr<WorkletRuntimeInspectorTarget> target) {
  const auto executor = target->inspectorConnection_->getExecutor();
  executor([target = std::move(target)] { target->teardown(); });
}

HostTargetMetadata WorkletRuntimeInspectorTarget::getMetadata() {
  return HostTargetMetadata{
      .appDisplayName = "Worklet Runtimes",
      .integrationName = "react-native-worklets",
#ifdef ANDROID
      .platform = "android",
#else
      .platform = "ios",
#endif // ANDROID
  };
}

void WorkletRuntimeInspectorTarget::onReload(const PageReloadRequest & /*request*/) {
  jsScheduler_->scheduleOnJS([runtimeName = runtimeName_](facebook::jsi::Runtime &rnRuntime) {
    const auto devSettings = getDevSettingsModule(rnRuntime);
    if (!devSettings.isObject()) {
      return;
    }
    const auto devSettingsObject = devSettings.asObject(rnRuntime);
    const auto reason = "CDP Page.reload from Worklet Runtime (" + runtimeName + ")";
    const auto reloadWithReason = devSettingsObject.getProperty(rnRuntime, "reloadWithReason");
    if (reloadWithReason.isObject() && reloadWithReason.asObject(rnRuntime).isFunction(rnRuntime)) {
      reloadWithReason.asObject(rnRuntime).asFunction(rnRuntime).callWithThis(
          rnRuntime, devSettingsObject, facebook::jsi::String::createFromUtf8(rnRuntime, reason));
      return;
    }
    devSettingsObject.getPropertyAsFunction(rnRuntime, "reload").callWithThis(rnRuntime, devSettingsObject);
  });
}

void WorkletRuntimeInspectorTarget::onSetPausedInDebuggerMessage(
    const OverlaySetPausedInDebuggerMessageRequest & /*request*/) {}

std::unique_ptr<HermesRuntimeTargetDelegate> WorkletRuntimeInspectorTarget::makeRuntimeTargetDelegate() {
#if REACT_NATIVE_VERSION_MINOR >= 85
  return std::make_unique<HermesRuntimeTargetDelegate>(runtime_, hermesRuntime_);
#else
  return std::make_unique<HermesRuntimeTargetDelegate>(
      std::shared_ptr<facebook::hermes::HermesRuntime>(runtime_, &hermesRuntime_));
#endif // REACT_NATIVE_VERSION_MINOR >= 85
}

facebook::react::RuntimeExecutor WorkletRuntimeInspectorTarget::makeRuntimeExecutor(
    const std::weak_ptr<WorkletRuntime> &weakWorkletRuntime) {
  return [weakWorkletRuntime, weakThis = weak_from_this()](RuntimeJob &&job) {
    const auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }
    if (strongThis->bufferSetupJob(job)) {
      return;
    }
    if (const auto workletRuntime = weakWorkletRuntime.lock()) {
      workletRuntime->schedule(std::move(job));
      return;
    }
    strongThis->runDetached(std::move(job));
  };
}

bool WorkletRuntimeInspectorTarget::bufferSetupJob(RuntimeJob &job) {
  std::lock_guard lock(setupJobsMutex_);
  if (!pendingSetupJobs_) {
    return false;
  }
  pendingSetupJobs_->push_back(std::move(job));
  return true;
}

void WorkletRuntimeInspectorTarget::flushSetupJobs() {
  std::vector<RuntimeJob> jobs;
  {
    std::lock_guard lock(setupJobsMutex_);
    jobs = std::move(*pendingSetupJobs_);
    pendingSetupJobs_.reset();
  }
  std::unique_lock runtimeLock(*runtimeMutex_);
  for (auto &job : jobs) {
    job(*runtime_);
  }
}

void WorkletRuntimeInspectorTarget::runDetached(RuntimeJob &&job) {
  std::unique_lock runtimeLock(*runtimeMutex_, std::try_to_lock);
  if (!runtimeLock.owns_lock()) {
    return;
  }
  job(*runtime_);
}

void WorkletRuntimeInspectorTarget::teardown() {
  detached_ = true;
  if (pageId_) {
    inspectorConnection_->removePage(*pageId_);
    pageId_.reset();
  }
  std::unique_lock runtimeLock(*runtimeMutex_);
  if (runtimeTarget_) {
    instanceTarget_->unregisterRuntime(*runtimeTarget_);
    runtimeTarget_ = nullptr;
  }
  if (instanceTarget_) {
    hostTarget_->unregisterInstance(*instanceTarget_);
    instanceTarget_ = nullptr;
  }
  hostTarget_.reset();
  runtimeTargetDelegate_.reset();
}

} // namespace worklets
