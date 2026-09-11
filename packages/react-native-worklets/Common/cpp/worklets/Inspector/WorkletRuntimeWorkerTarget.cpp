#include <worklets/Inspector/WorkletRuntimeWorkerTarget.h>

#ifdef WORKLETS_RN_WORKER_RUNTIME_TARGETS

#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <cxxreact/ReactNativeVersion.h>

#include <memory>
#include <string>
#include <utility>

namespace worklets {

using namespace facebook::react::jsinspector_modern;

WorkletRuntimeWorkerTarget::WorkletRuntimeWorkerTarget(
    const std::string &runtimeName,
    const std::shared_ptr<facebook::jsi::Runtime> &runtime,
    facebook::hermes::HermesRuntime &hermesRuntime,
    const std::shared_ptr<std::recursive_mutex> &runtimeMutex,
    const std::weak_ptr<HostTarget> &hostTarget)
    : runtimeName_(runtimeName),
      runtime_(runtime),
      hermesRuntime_(hermesRuntime),
      runtimeMutex_(runtimeMutex),
      hostTarget_(hostTarget),
#if REACT_NATIVE_VERSION_MINOR >= 85
      runtimeTargetDelegate_(std::make_unique<HermesRuntimeTargetDelegate>(runtime_, hermesRuntime_)) {
}
#else
      runtimeTargetDelegate_(std::make_unique<HermesRuntimeTargetDelegate>(
          std::shared_ptr<facebook::hermes::HermesRuntime>(runtime_, &hermesRuntime_))) {
}
#endif // REACT_NATIVE_VERSION_MINOR >= 85

WorkletRuntimeWorkerTarget::~WorkletRuntimeWorkerTarget() = default;

void WorkletRuntimeWorkerTarget::attach(const std::weak_ptr<WorkletRuntime> &weakWorkletRuntime) {
  const auto hostTarget = hostTarget_.lock();
  if (!hostTarget) {
    return;
  }
  hostTarget->executorFromThis()([self = shared_from_this(),
                                  jsExecutor = makeRuntimeExecutor(weakWorkletRuntime)](HostTarget &host) mutable {
    self->workerTarget_ = &host.registerWorkerRuntime(
        WorkerRuntimeDescription{
            .title = "Worklet Runtime (" + self->runtimeName_ + ")", .url = "worklets://runtime/" + self->runtimeName_},
        *self->runtimeTargetDelegate_,
        std::move(jsExecutor));
  });
  if (const auto workletRuntime = weakWorkletRuntime.lock()) {
    workletRuntime->schedule(
        [hermesRuntime = &hermesRuntime_](facebook::jsi::Runtime &) { hermesRuntime->registerForProfiling(); });
  }
}

void WorkletRuntimeWorkerTarget::detach(std::shared_ptr<WorkletRuntimeWorkerTarget> target) {
  const auto hostTarget = target->hostTarget_.lock();
  if (!hostTarget) {
    target->destroyDelegate();
    return;
  }
  hostTarget->executorFromThis()([target = std::move(target)](HostTarget &host) {
    if (target->workerTarget_ != nullptr) {
      host.unregisterWorkerRuntime(*target->workerTarget_);
      target->workerTarget_ = nullptr;
    }
    target->destroyDelegate();
  });
}

facebook::react::RuntimeExecutor WorkletRuntimeWorkerTarget::makeRuntimeExecutor(
    const std::weak_ptr<WorkletRuntime> &weakWorkletRuntime) {
  return [weakWorkletRuntime, weakThis = weak_from_this()](RuntimeJob &&job) {
    if (const auto workletRuntime = weakWorkletRuntime.lock()) {
      workletRuntime->schedule(std::move(job));
      return;
    }
    if (const auto strongThis = weakThis.lock()) {
      strongThis->runDetached(std::move(job));
    }
  };
}

void WorkletRuntimeWorkerTarget::runDetached(RuntimeJob &&job) {
  std::unique_lock runtimeLock(*runtimeMutex_, std::try_to_lock);
  if (!runtimeLock.owns_lock()) {
    return;
  }
  job(*runtime_);
}

void WorkletRuntimeWorkerTarget::destroyDelegate() {
  std::unique_lock runtimeLock(*runtimeMutex_);
  runtimeTargetDelegate_.reset();
}

} // namespace worklets

#endif // WORKLETS_RN_WORKER_RUNTIME_TARGETS
