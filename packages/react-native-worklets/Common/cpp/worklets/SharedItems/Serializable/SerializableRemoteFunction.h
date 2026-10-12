#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/RNRuntimeStatus.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <string>

namespace worklets {

class RuntimeManager;

class SerializableRemoteFunction : public Serializable,
                                   public std::enable_shared_from_this<SerializableRemoteFunction> {
 public:
  /** Creates RN Runtime Remote Function. */
  SerializableRemoteFunction(
      facebook::jsi::Runtime &rnRuntime,
      const std::string &name,
      facebook::jsi::Function &&function,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus)
      : Serializable(ValueType::RemoteFunctionType),
        hostRuntime_(&rnRuntime),
        hostRuntimeId_(RuntimeData::rnRuntimeId),
        function_(std::make_unique<facebook::jsi::Value>(rnRuntime, std::move(function))),
        name_(name),
        jsScheduler_(jsScheduler),
        rnRuntimeStatus_(rnRuntimeStatus) {}

  /** Creates Worklet Runtime Remote Function. */
  SerializableRemoteFunction(
      facebook::jsi::Runtime &workletRuntime,
      const std::string &name,
      facebook::jsi::Function &&function,
      RuntimeData::RuntimeId hostRuntimeId)
      : Serializable(ValueType::RemoteFunctionType),
        hostRuntime_(&workletRuntime),
        hostRuntimeId_(hostRuntimeId),
        function_(std::make_unique<facebook::jsi::Value>(workletRuntime, std::move(function))),
        name_(name),
        jsScheduler_(nullptr),
        rnRuntimeStatus_(nullptr) {}

  ~SerializableRemoteFunction() override;

  SerializableRemoteFunction(const SerializableRemoteFunction &) = delete;
  SerializableRemoteFunction &operator=(const SerializableRemoteFunction &) = delete;

  void resolveOrRejectPromise(
      const std::shared_ptr<Serializable> &resolveValue,
      const std::shared_ptr<RuntimeManager> &runtimeManager);

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

  [[nodiscard]] bool isHostedOnRNRuntime() const noexcept {
    return hostRuntimeId_ == RuntimeData::rnRuntimeId;
  }

  [[nodiscard]] RuntimeData::RuntimeId getHostRuntimeId() const noexcept {
    return hostRuntimeId_;
  }

 private:
  facebook::jsi::Runtime *hostRuntime_;
  const RuntimeData::RuntimeId hostRuntimeId_;
  std::unique_ptr<facebook::jsi::Value> function_;
  const std::string name_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  const std::shared_ptr<RNRuntimeStatus> rnRuntimeStatus_;
};

facebook::jsi::Value makeRNRuntimeSerializableRemoteFunction(
    facebook::jsi::Runtime &rnRuntime,
    const std::string &name,
    const facebook::jsi::Function &function,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus);

facebook::jsi::Value makeWorkletRuntimeSerializableRemoteFunction(
    facebook::jsi::Runtime &workletRuntime,
    const std::string &name,
    const facebook::jsi::Function &function,
    RuntimeData::RuntimeId hostRuntimeId);

} // namespace worklets
