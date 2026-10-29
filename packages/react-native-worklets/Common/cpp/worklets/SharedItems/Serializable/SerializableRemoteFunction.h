#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
#include <worklets/WorkletRuntime/RuntimeIdentity.h>

#include <memory>
#include <string>
#include <utility>

namespace worklets {

class SerializableRemoteFunction : public Serializable,
                                   public std::enable_shared_from_this<SerializableRemoteFunction> {
 public:
  SerializableRemoteFunction(
      facebook::jsi::Runtime &hostRuntime,
      const std::string &name,
      facebook::jsi::Function &&function,
      RuntimeIdentity hostIdentity,
      const std::shared_ptr<JSScheduler> &jsScheduler = nullptr)
      : Serializable(ValueType::RemoteFunctionType),
        hostIdentity_(std::move(hostIdentity)),
        function_(std::make_unique<facebook::jsi::Value>(hostRuntime, std::move(function))),
        name_(name),
        jsScheduler_(jsScheduler) {
    react_native_assert(
        hostIdentity_.isRNRuntime() == (jsScheduler_ != nullptr) &&
        "[Worklets] A Remote Function needs a JSScheduler if and only if it is hosted on the RN Runtime.");
  }

  ~SerializableRemoteFunction() override;

  SerializableRemoteFunction(const SerializableRemoteFunction &) = delete;
  SerializableRemoteFunction &operator=(const SerializableRemoteFunction &) = delete;

  void resolveOrRejectPromise(const std::shared_ptr<Serializable> &resolveValue);

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

  [[nodiscard]] bool isHostedOnRNRuntime() const noexcept {
    return hostIdentity_.isRNRuntime();
  }

  [[nodiscard]] RuntimeData::RuntimeId getHostRuntimeId() const noexcept {
    return hostIdentity_.getRuntimeId();
  }

 private:
  const RuntimeIdentity hostIdentity_;
  std::unique_ptr<facebook::jsi::Value> function_;
  const std::string name_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
};

facebook::jsi::Value makeSerializableRemoteFunction(
    facebook::jsi::Runtime &hostRuntime,
    const std::string &name,
    const facebook::jsi::Function &function,
    const RuntimeIdentity &hostIdentity,
    const std::shared_ptr<JSScheduler> &jsScheduler = nullptr);

} // namespace worklets
