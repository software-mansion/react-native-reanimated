#pragma once

#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {

class IWorkletsModuleProxy {
 public:
  virtual ~IWorkletsModuleProxy() = default;

  [[nodiscard]] virtual std::shared_ptr<UIScheduler> getUIScheduler() const = 0;

  [[nodiscard]] virtual std::shared_ptr<WorkletRuntime> getUIWorkletRuntime() const = 0;
};

} // namespace worklets
