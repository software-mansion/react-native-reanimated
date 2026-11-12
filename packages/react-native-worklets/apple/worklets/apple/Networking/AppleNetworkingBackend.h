#if __cplusplus

#import <worklets/Networking/NetworkingBackend.h>

#import <memory>
#import <optional>
#import <string>
#import <vector>

@class WorkletsURLSessionDelegate;
@class WorkletsWebSocketDelegate;

namespace worklets {

class AppleNetworkingBackend final : public NetworkingBackend {
 public:
  AppleNetworkingBackend();
  ~AppleNetworkingBackend() override;

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
  WorkletsURLSessionDelegate *delegate_;
  WorkletsWebSocketDelegate *webSocketDelegate_;
};

} // namespace worklets

#endif // __cplusplus
