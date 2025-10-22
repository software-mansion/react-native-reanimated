#pragma once

#include <memory>

namespace worklets {

class WorkletRuntime;

/**
 * Holds a weak reference to a WorkletRuntime instance.
 *
 * Used to link jsi::Runtime instances back to their WorkletRuntime holders
 * without inducing reference cycles.
 */
struct WeakRuntimeHolder {
  std::weak_ptr<WorkletRuntime> weakRuntime;
};

} // namespace worklets
