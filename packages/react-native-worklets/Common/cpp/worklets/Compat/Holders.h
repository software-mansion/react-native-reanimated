#pragma once

#include <jsi/jsi.h>
#include <worklets/Compat/ReanimatedApi.h>

namespace worklets {

class NativeStateWorkletRuntimeHolder : public facebook::jsi::NativeState {
 public:
  explicit NativeStateWorkletRuntimeHolder(uintptr_t sharedPtr)
      : holder_(std::make_shared<WorkletRuntimeHolder>(sharedPtr)) {}

  const std::shared_ptr<WorkletRuntimeHolder> holder_;
};

class NativeStateUISchedulerHolder : public facebook::jsi::NativeState {
 public:
  explicit NativeStateUISchedulerHolder(uintptr_t sharedPtr)
      : holder_(std::make_shared<UISchedulerHolder>(sharedPtr)) {}

  const std::shared_ptr<UISchedulerHolder> holder_;
};

} // namespace worklets
