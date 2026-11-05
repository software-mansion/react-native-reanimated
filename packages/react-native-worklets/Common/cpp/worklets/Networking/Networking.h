#pragma once

#include <jsi/jsi.h>
#include <worklets/Networking/NetworkingBackend.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <atomic>
#include <cstdint>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

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
  std::optional<std::string> decodeTextWithPlatform(const uint8_t *data, size_t size, const std::string &label);

  uint64_t connectWebSocket(jsi::Runtime &rt, const jsi::Object &config, jsi::Function &&callback);
  void sendWebSocketText(jsi::Runtime &rt, uint64_t socketId, std::string &&message);
  void sendWebSocketBinary(jsi::Runtime &rt, uint64_t socketId, std::vector<uint8_t> &&message);
  void closeWebSocket(jsi::Runtime &rt, uint64_t socketId, uint16_t code, std::string &&reason);

 private:
  struct RequestRecord {
    RequestRecord(std::weak_ptr<WorkletRuntime> weakRuntime, RuntimeData::RuntimeId runtimeId)
        : weakRuntime(std::move(weakRuntime)), runtimeId(runtimeId) {}

    const std::weak_ptr<WorkletRuntime> weakRuntime;
    const RuntimeData::RuntimeId runtimeId;
    std::atomic<bool> settled{false};
  };

  class RequestListener;
  class SocketListener;

  void unregisterRequest(uint64_t requestId);
  void unregisterSocket(uint64_t socketId);
  bool ownsSocket(jsi::Runtime &rt, uint64_t socketId);

  const std::shared_ptr<NetworkingBackend> backend_;
  std::atomic<uint64_t> nextRequestId_{1};
  std::mutex requestsMutex_;
  std::unordered_map<uint64_t, std::shared_ptr<RequestRecord>> requests_;
  std::atomic<uint64_t> nextSocketId_{1};
  std::mutex socketsMutex_;
  std::unordered_map<uint64_t, std::shared_ptr<RequestRecord>> sockets_;
};

} // namespace worklets
