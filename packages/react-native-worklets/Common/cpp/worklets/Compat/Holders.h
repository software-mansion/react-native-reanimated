#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {

class NativeStateWorkletRuntimeHolder : public facebook::jsi::NativeState {
 public:
  explicit NativeStateWorkletRuntimeHolder(const std::shared_ptr<WorkletRuntime> &runtime) : runtime_(runtime) {}

  const std::shared_ptr<WorkletRuntime> runtime_;
};

class NativeStateUISchedulerHolder : public facebook::jsi::NativeState {
 public:
  explicit NativeStateUISchedulerHolder(const std::shared_ptr<UIScheduler> &scheduler) : scheduler_(scheduler) {}

  const std::shared_ptr<UIScheduler> scheduler_;
};

} // namespace worklets
