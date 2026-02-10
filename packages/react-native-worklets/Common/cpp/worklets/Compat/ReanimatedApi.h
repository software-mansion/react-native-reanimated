#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/SerializableBase.h>

#include <cstdint>

namespace worklets {

class WorkletRuntimeHolder : public facebook::jsi::NativeState {
 public:
  explicit WorkletRuntimeHolder(uintptr_t sharedPtr) : sharedPtr_(sharedPtr) {}

  ~WorkletRuntimeHolder() override;

  uintptr_t sharedPtr_;
};

class UISchedulerHolder : public facebook::jsi::NativeState {
 public:
  explicit UISchedulerHolder(uintptr_t sharedPtr) : sharedPtr_(sharedPtr) {}

  ~UISchedulerHolder() override;

  uintptr_t sharedPtr_;
};

extern facebook::jsi::Runtime *getRuntimeAddressFromHolder(const std::shared_ptr<WorkletRuntimeHolder> &holder);

extern void scheduleOnUI(const std::shared_ptr<UISchedulerHolder> &uiSchedulerHolder, const std::function<void()> &job);

// TODO: Remove the use of this function from Reanimated
extern std::string JSIValueToString(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value);

extern std::shared_ptr<Serializable>
extractSerializable(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value, const std::string &errorMessage);

extern std::shared_ptr<Serializable>
extractWorklet(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value, const std::string &errorMessage);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0,
    const facebook::jsi::Value &arg1);

} // namespace worklets
