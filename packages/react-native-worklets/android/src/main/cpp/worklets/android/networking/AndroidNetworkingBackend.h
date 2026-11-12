#pragma once

#include <fbjni/fbjni.h>
#include <worklets/Networking/NetworkingBackend.h>

#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace worklets {

namespace jni = facebook::jni;

class JNetworking : public jni::JavaClass<JNetworking> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/worklets/networking/Networking;";
};

class AndroidNetworkingBackend final : public NetworkingBackend {
 public:
  explicit AndroidNetworkingBackend(jni::global_ref<JNetworking::javaobject> networking);

  void sendRequest(uint64_t requestId, RequestConfig &&config, const std::shared_ptr<NetworkRequestListener> &listener)
      override;
  void abortRequest(uint64_t requestId) override;
  std::optional<std::string> decodeText(const uint8_t *data, size_t size, const std::string &label) override;

  void connectWebSocket(uint64_t socketId, WebSocketConfig &&config, const std::shared_ptr<WebSocketListener> &listener)
      override;
  void sendWebSocketText(uint64_t socketId, std::string &&message) override;
  void sendWebSocketBinary(uint64_t socketId, std::vector<uint8_t> &&message) override;
  void closeWebSocket(uint64_t socketId, uint16_t code, std::string &&reason) override;

 private:
  const jni::global_ref<JNetworking::javaobject> networking_;
};

} // namespace worklets
