#pragma once

#include <worklets/Tools/Defs.h>

#if JS_RUNTIME_HERMES

#include <ReactCommon/RuntimeExecutor.h>
#include <hermes/hermes.h>
#include <hermes/inspector-modern/chrome/HermesRuntimeTargetDelegate.h>
#include <jsi/jsi.h>
#include <jsinspector-modern/ReactCdp.h>

#include <memory>
#include <string>

namespace worklets {

/**
 * Registers a worklet Hermes runtime with the global jsinspector-modern
 * inspector so it appears as a separate page in React Native DevTools.
 *
 * Each worklet runtime gets its own HostTarget → InstanceTarget → RuntimeTarget
 * hierarchy (since InstanceTarget only supports one RuntimeTarget at a time).
 * Constructed when the runtime is created, destroyed when it is torn down.
 */
class WorkletRuntimeInspectorTarget {
 public:
  WorkletRuntimeInspectorTarget(
      const std::string &name,
      std::shared_ptr<facebook::jsi::Runtime> runtimeForLifetime,
      facebook::hermes::HermesRuntime &hermesRuntime,
      facebook::react::RuntimeExecutor runtimeExecutor);

  ~WorkletRuntimeInspectorTarget();

  WorkletRuntimeInspectorTarget(const WorkletRuntimeInspectorTarget &) = delete;
  WorkletRuntimeInspectorTarget &operator=(const WorkletRuntimeInspectorTarget &) = delete;

 private:
  class HostDelegate;
  class InstanceDelegate;
  class FilteringRemoteConnection;
  class WorkletLocalConnection;

  std::unique_ptr<HostDelegate> hostDelegate_;
  std::unique_ptr<InstanceDelegate> instanceDelegate_;
  std::unique_ptr<facebook::react::jsinspector_modern::HermesRuntimeTargetDelegate> hermesTargetDelegate_;
  std::shared_ptr<facebook::react::jsinspector_modern::HostTarget> hostTarget_;
  facebook::react::jsinspector_modern::InstanceTarget *instanceTarget_{nullptr};
  facebook::react::jsinspector_modern::RuntimeTarget *runtimeTarget_{nullptr};
  int inspectorPageId_{-1};
  facebook::react::RuntimeExecutor runtimeExecutor_;
};

} // namespace worklets

#endif // JS_RUNTIME_HERMES
