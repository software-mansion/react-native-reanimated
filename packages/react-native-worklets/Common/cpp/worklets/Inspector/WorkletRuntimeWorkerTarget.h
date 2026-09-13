#pragma once

#include <worklets/Inspector/WorkletsInspectorConfig.h>

#ifdef WORKLETS_RN_WORKER_RUNTIME_TARGETS

#include <ReactCommon/RuntimeExecutor.h>
#include <hermes/hermes.h>
#include <hermes/inspector-modern/chrome/HermesRuntimeTargetDelegate.h>
#include <jsi/jsi.h>

#include <functional>
#include <memory>
#include <mutex>
#include <string>

namespace worklets {

class WorkletRuntime;

/**
 * Registers a Worklet Runtime as a worker target of the React Native app's own
 * inspector host, so it shows up as a thread of the React Native DevTools
 * session next to the RN Runtime. Requires a React Native that exposes
 * `HostTarget::registerWorkerRuntime`.
 *
 * The target is created on the thread that initializes the runtime and is
 * registered and torn down on the host's inspector executor.
 */
class WorkletRuntimeWorkerTarget final : public std::enable_shared_from_this<WorkletRuntimeWorkerTarget> {
 public:
  WorkletRuntimeWorkerTarget(
      const std::string &runtimeName,
      const std::shared_ptr<facebook::jsi::Runtime> &runtime,
      facebook::hermes::HermesRuntime &hermesRuntime,
      const std::shared_ptr<std::recursive_mutex> &runtimeMutex,
      const std::weak_ptr<facebook::react::jsinspector_modern::HostTarget> &hostTarget);

  ~WorkletRuntimeWorkerTarget();

  /**
   * Registers the runtime with the host. The DevTools globals are installed on
   * the runtime through its own async queue.
   */
  void attach(const std::weak_ptr<WorkletRuntime> &weakWorkletRuntime);

  /**
   * Unregisters the runtime from the host and destroys the target on the
   * host's inspector executor. Takes ownership of the target so it can outlive
   * the WorkletRuntime that created it.
   */
  static void detach(std::shared_ptr<WorkletRuntimeWorkerTarget> target);

 private:
  using RuntimeJob = std::function<void(facebook::jsi::Runtime &)>;

  facebook::react::RuntimeExecutor makeRuntimeExecutor(const std::weak_ptr<WorkletRuntime> &weakWorkletRuntime);
  void runDetached(RuntimeJob &&job);
  void destroyDelegate();

  const std::string runtimeName_;
  const std::shared_ptr<facebook::jsi::Runtime> runtime_;
  facebook::hermes::HermesRuntime &hermesRuntime_;
  const std::shared_ptr<std::recursive_mutex> runtimeMutex_;
  const std::weak_ptr<facebook::react::jsinspector_modern::HostTarget> hostTarget_;
  std::unique_ptr<facebook::react::jsinspector_modern::HermesRuntimeTargetDelegate> runtimeTargetDelegate_;
  facebook::react::jsinspector_modern::WorkerRuntimeTarget *workerTarget_{nullptr};
};

} // namespace worklets

#endif // WORKLETS_RN_WORKER_RUNTIME_TARGETS
