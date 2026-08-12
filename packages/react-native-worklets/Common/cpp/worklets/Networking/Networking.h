#pragma once

#include <jsi/jsi.h>
#include <worklets/Networking/NetworkingBackend.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <atomic>
#include <cstdint>
#include <memory>
#include <mutex>
#include <unordered_map>

using namespace facebook;

namespace worklets {

class WorkletRuntime;

class Networking : public std::enable_shared_from_this<Networking> {
 public:
  explicit Networking(const std::shared_ptr<NetworkingBackend> &backend);

  uint64_t sendRequest(jsi::Runtime &rt, const jsi::Object &config, jsi::Function &&callback);
  void abortRequest(jsi::Runtime &rt, uint64_t requestId);
  void abortAllForRuntime(RuntimeData::RuntimeId runtimeId);
  void abortAll();

 private:
  struct RequestRecord {
    RequestRecord(std::weak_ptr<WorkletRuntime> weakRuntime, RuntimeData::RuntimeId runtimeId)
        : weakRuntime(std::move(weakRuntime)), runtimeId(runtimeId) {}

    const std::weak_ptr<WorkletRuntime> weakRuntime;
    const RuntimeData::RuntimeId runtimeId;
    std::atomic<bool> settled{false};
  };

  class RequestListener;

  void unregisterRequest(uint64_t requestId);

  const std::shared_ptr<NetworkingBackend> backend_;
  std::atomic<uint64_t> nextRequestId_{1};
  std::mutex requestsMutex_;
  std::unordered_map<uint64_t, std::shared_ptr<RequestRecord>> requests_;
};

} // namespace worklets
