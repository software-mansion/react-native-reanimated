#pragma once

#include <ReactCommon/RuntimeExecutor.h>
#include <hermes/hermes.h>
#include <hermes/inspector-modern/chrome/HermesRuntimeTargetDelegate.h>
#include <jsi/jsi.h>
#include <jsinspector-modern/HostTarget.h>
#include <jsinspector-modern/InstanceTarget.h>
#include <jsinspector-modern/RuntimeTarget.h>
#include <worklets/Inspector/WorkletsInspectorConnection.h>
#include <worklets/Tools/JSScheduler.h>

#include <atomic>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <vector>

namespace worklets {

class WorkletRuntime;

/**
 * Registers a Worklet Runtime as a standalone debug target in React Native
 * DevTools. Each attached runtime shows up as a separate page of the Worklets
 * inspector connection, next to the React Native app's own pages.
 *
 * The target is created and attached on the thread that initializes the
 * runtime and is torn down on the inspector thread of the connection, which is
 * where every inspector message for the target is dispatched.
 */
class WorkletRuntimeInspectorTarget final : public facebook::react::jsinspector_modern::HostTargetDelegate,
                                            public facebook::react::jsinspector_modern::InstanceTargetDelegate,
                                            public std::enable_shared_from_this<WorkletRuntimeInspectorTarget> {
 public:
  /**
   * Whether React Native DevTools (Fusebox) is enabled in this build.
   */
  static bool isInspectorEnabled();

  WorkletRuntimeInspectorTarget(
      const std::string &runtimeName,
      const std::shared_ptr<facebook::jsi::Runtime> &runtime,
      facebook::hermes::HermesRuntime &hermesRuntime,
      const std::shared_ptr<std::recursive_mutex> &runtimeMutex,
      const std::shared_ptr<WorkletsInspectorConnection> &inspectorConnection,
      const std::shared_ptr<JSScheduler> &jsScheduler);

  ~WorkletRuntimeInspectorTarget() override;

  /**
   * Registers the runtime with the inspector and installs the DevTools globals
   * on it synchronously. Must be called once, from the thread that currently
   * owns the runtime, before any user code runs on it.
   */
  void attach(const std::weak_ptr<WorkletRuntime> &weakWorkletRuntime);

  /**
   * Removes the page from the inspector and destroys the target on the
   * inspector thread. Takes ownership of the target so it can outlive the
   * WorkletRuntime that created it.
   */
  static void detach(std::shared_ptr<WorkletRuntimeInspectorTarget> target);

  facebook::react::jsinspector_modern::HostTargetMetadata getMetadata() override;

  /**
   * A Worklet Runtime cannot be reloaded on its own, so a reload request from
   * DevTools reloads the whole React Native app through the DevSettings module
   * of the RN Runtime.
   */
  void onReload(const PageReloadRequest &request) override;

  void onSetPausedInDebuggerMessage(const OverlaySetPausedInDebuggerMessageRequest &request) override;

 private:
  using RuntimeJob = std::function<void(facebook::jsi::Runtime &)>;

  std::unique_ptr<facebook::react::jsinspector_modern::HermesRuntimeTargetDelegate> makeRuntimeTargetDelegate();

  facebook::react::RuntimeExecutor makeRuntimeExecutor(const std::weak_ptr<WorkletRuntime> &weakWorkletRuntime);

  bool bufferSetupJob(RuntimeJob &job);

  void flushSetupJobs();

  void runDetached(RuntimeJob &&job);

  void teardown();

  const std::string runtimeName_;
  const std::shared_ptr<facebook::jsi::Runtime> runtime_;
  facebook::hermes::HermesRuntime &hermesRuntime_;
  const std::shared_ptr<std::recursive_mutex> runtimeMutex_;
  const std::shared_ptr<WorkletsInspectorConnection> inspectorConnection_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  std::unique_ptr<facebook::react::jsinspector_modern::HermesRuntimeTargetDelegate> runtimeTargetDelegate_;
  std::shared_ptr<facebook::react::jsinspector_modern::HostTarget> hostTarget_;
  facebook::react::jsinspector_modern::InstanceTarget *instanceTarget_{nullptr};
  facebook::react::jsinspector_modern::RuntimeTarget *runtimeTarget_{nullptr};
  std::optional<int> pageId_;
  std::mutex setupJobsMutex_;
  std::optional<std::vector<RuntimeJob>> pendingSetupJobs_;
  std::atomic<bool> detached_{false};
};

} // namespace worklets
