#include <worklets/WorkletRuntime/WorkletHermesRuntime.h>

#include <jsi/jsi.h>

#include <memory>
#include <utility>

namespace worklets {

WorkletHermesRuntime::WorkletHermesRuntime(std::unique_ptr<facebook::hermes::HermesRuntime> runtime)
    : jsi::WithRuntimeDecorator<WorkletsReentrancyCheck>(*runtime, reentrancyCheck_), runtime_(std::move(runtime)) {}

WorkletHermesRuntime::~WorkletHermesRuntime() = default;

} // namespace worklets
