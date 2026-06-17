#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <mutex>
#include <string>
#include <utility>

namespace worklets {

class RuntimeManager;

class SerializableRemoteFunction : public Serializable,
                                   public std::enable_shared_from_this<SerializableRemoteFunction> {
 public:
  class RNOrigin;
  class WorkletOrigin;

  ~SerializableRemoteFunction() override;

  SerializableRemoteFunction(const SerializableRemoteFunction &) = delete;
  SerializableRemoteFunction &operator=(const SerializableRemoteFunction &) = delete;

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override = 0;

  virtual void resolveOrRejectPromise(
      const std::shared_ptr<Serializable> &resolveValue,
      const std::shared_ptr<RuntimeManager> &runtimeManager) = 0;

  [[nodiscard]] virtual bool isHostedOnRNRuntime() const noexcept = 0;

  [[nodiscard]] RuntimeData::RuntimeId getHostRuntimeId() const {
    return hostRuntimeId_;
  }

  [[nodiscard]] facebook::jsi::Runtime *getHostRuntime() const {
    return hostRuntime_;
  }

  [[nodiscard]] const std::string &getName() const {
    return name_;
  }

 protected:
  facebook::jsi::Runtime *hostRuntime_;
  const RuntimeData::RuntimeId hostRuntimeId_;
  const std::string name_;

  SerializableRemoteFunction(
      facebook::jsi::Runtime *hostRuntime,
      RuntimeData::RuntimeId hostRuntimeId,
      const std::string &name)
      : Serializable(ValueType::RemoteFunctionType),
        hostRuntime_(hostRuntime),
        hostRuntimeId_(hostRuntimeId),
        name_(name) {}

  facebook::jsi::Value unpackSelf(facebook::jsi::Runtime &rt);
};

class SerializableRemoteFunction::RNOrigin final : public SerializableRemoteFunction {
 public:
  RNOrigin(
      facebook::jsi::Runtime &rnRuntime,
      const std::string &name,
      int remoteId,
      const std::shared_ptr<JSScheduler> &jsScheduler)
      : SerializableRemoteFunction(&rnRuntime, RuntimeData::rnRuntimeId, name),
        remoteId_(remoteId),
        jsScheduler_(jsScheduler) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

  void resolveOrRejectPromise(
      const std::shared_ptr<Serializable> &resolveValue,
      const std::shared_ptr<RuntimeManager> &runtimeManager) override;

  [[nodiscard]] bool isHostedOnRNRuntime() const noexcept override {
    return true;
  }

  [[nodiscard]] int getRemoteId() const {
    return remoteId_;
  }
  [[nodiscard]] const std::shared_ptr<JSScheduler> &getJSScheduler() const {
    return jsScheduler_;
  }

 private:
  class RNOriginProxy;

  const int remoteId_;
  const std::shared_ptr<JSScheduler> jsScheduler_;
  std::weak_ptr<SerializableRemoteFunction> proxy_;
  std::mutex proxyMutex_;
};

class SerializableRemoteFunction::WorkletOrigin final : public SerializableRemoteFunction {
 public:
  WorkletOrigin(
      facebook::jsi::Runtime &workletRuntime,
      const std::string &name,
      facebook::jsi::Function &&function,
      RuntimeData::RuntimeId hostRuntimeId)
      : SerializableRemoteFunction(&workletRuntime, hostRuntimeId, name),
        function_(std::make_unique<facebook::jsi::Value>(workletRuntime, std::move(function))) {}

  ~WorkletOrigin() override;

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

  void resolveOrRejectPromise(
      const std::shared_ptr<Serializable> &resolveValue,
      const std::shared_ptr<RuntimeManager> &runtimeManager) override;

  [[nodiscard]] bool isHostedOnRNRuntime() const noexcept override {
    return false;
  }

 private:
  std::unique_ptr<facebook::jsi::Value> function_;
};

class SerializableRemoteFunction::RNOrigin::RNOriginProxy final : public SerializableRemoteFunction {
 public:
  explicit RNOriginProxy(const std::shared_ptr<RNOrigin> &origin);

  ~RNOriginProxy() override;

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

  void resolveOrRejectPromise(
      const std::shared_ptr<Serializable> &resolveValue,
      const std::shared_ptr<RuntimeManager> &runtimeManager) override;

  [[nodiscard]] bool isHostedOnRNRuntime() const noexcept override {
    return false;
  }

 private:
  std::shared_ptr<RNOrigin> origin_;
};

} // namespace worklets
