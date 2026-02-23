#pragma once

#include <jsi/jsi.h>
#include <worklets/Compat/StableApi.h>

#include <memory>

namespace worklets {

class NativeStateWorkletRuntimeHolder : public facebook::jsi::NativeState {
 public:
  explicit NativeStateWorkletRuntimeHolder(const std::shared_ptr<WorkletRuntime> &workletRuntime)
      : holder_(std::make_shared<WorkletRuntimeHolder>(workletRuntime)) {}

  const std::shared_ptr<WorkletRuntimeHolder> holder_;
};

class NativeStateUISchedulerHolder : public facebook::jsi::NativeState {
 public:
  explicit NativeStateUISchedulerHolder(const std::shared_ptr<UIScheduler> &uiScheduler)
      : holder_(std::make_shared<UISchedulerHolder>(uiScheduler)) {}

  const std::shared_ptr<UISchedulerHolder> holder_;
};

} // namespace worklets
