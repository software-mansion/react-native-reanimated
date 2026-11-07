#pragma once

#include <worklets/Networking/NetworkingTypes.h>

#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace worklets {

/**
 * Implemented by the networking core. Backends may invoke the methods from any
 * thread. Exactly one of `onComplete` or `onError` must be invoked per request,
 * as the last call for that request.
 */
class NetworkRequestListener {
 public:
  virtual void onResponse(ResponseInfo &&responseInfo) = 0;
  virtual void onUploadProgress(int64_t sent, int64_t total) = 0;
  virtual void onDownloadProgress(int64_t received, int64_t total) = 0;
  virtual void onComplete(std::vector<uint8_t> &&body) = 0;
  virtual void onError(RequestError error, std::string &&message) = 0;
  virtual ~NetworkRequestListener() = default;
};

/**
 * Implemented by the networking core. Backends may invoke the methods from any
 * thread. `onClose` must be the last call for that socket, and must be invoked
 * exactly once for a socket that `connect` accepted.
 */
class WebSocketListener {
 public:
  virtual void onOpen(std::string &&protocol, std::string &&extensions) = 0;
  /** Reports bytes handed to the socket, so `bufferedAmount` can drain. */
  virtual void onFlushed(int64_t bytes) = 0;
  virtual void onTextMessage(std::string &&message) = 0;
  virtual void onBinaryMessage(std::vector<uint8_t> &&message) = 0;
  virtual void onError(std::string &&message) = 0;
  virtual void onClose(uint16_t code, std::string &&reason, bool wasClean) = 0;
  virtual ~WebSocketListener() = default;
};

class NetworkingBackend {
 public:
  virtual void
  sendRequest(uint64_t requestId, RequestConfig &&config, const std::shared_ptr<NetworkRequestListener> &listener) = 0;
  virtual void abortRequest(uint64_t requestId) = 0;

  /**
   * A backend that doesn't implement WebSockets reports the failure through the
   * listener, so the JavaScript side sees an ordinary connection error.
   */
  virtual void connectWebSocket(
      uint64_t /*socketId*/,
      WebSocketConfig && /*config*/,
      const std::shared_ptr<WebSocketListener> &listener) {
    listener->onError("WebSocket is not supported on this platform.");
    // NOLINTNEXTLINE(bugprone-branch-clone)
    listener->onClose(static_cast<uint16_t>(WebSocketCloseCode::AbnormalClosure), "", false);
  }

  virtual void sendWebSocketText(uint64_t /*socketId*/, std::string && /*message*/) {}
  virtual void sendWebSocketBinary(uint64_t /*socketId*/, std::vector<uint8_t> && /*message*/) {}
  virtual void closeWebSocket(uint64_t /*socketId*/, uint16_t /*code*/, std::string && /*reason*/) {}

  /**
   * Decodes bytes with a legacy encoding the shared C++ decoders don't cover,
   * using the platform's own tables. Returns `std::nullopt` when the label is
   * unknown to the platform. The result must be valid UTF-8.
   */
  virtual std::optional<std::string>
  decodeText(const uint8_t * /*data*/, size_t /*size*/, const std::string & /*label*/) {
    return std::nullopt;
  }

  virtual ~NetworkingBackend() = default;
};

} // namespace worklets
