#include <worklets/WorkletRuntime/RuntimeManager.h>
#include <worklets/WorkletRuntime/WorkletHermesRuntime.h>

#include <jsi/jsi.h>

#include <memory>
#include <utility>

namespace worklets {

WorkletHermesRuntime::WorkletHermesRuntime(
    std::unique_ptr<facebook::hermes::HermesRuntime> runtime,
    RuntimeIdentity identity)
    : jsi::WithRuntimeDecorator<WorkletsReentrancyCheck>(*runtime, reentrancyCheck_),
      runtime_(std::move(runtime)),
      identity_(std::move(identity)) {
  if (const auto runtimeManager = identity_.lockRuntimeManager()) {
    runtimeManager->onRuntimeCreated(identity_.getRuntimeId());
  }
}

WorkletHermesRuntime::~WorkletHermesRuntime() {
  if (const auto runtimeManager = identity_.lockRuntimeManager()) {
    runtimeManager->onRuntimeDestroyed(identity_.getRuntimeId());
  }
}

} // namespace worklets
