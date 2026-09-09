#if __cplusplus

#import <worklets/Networking/NetworkingBackend.h>

#import <memory>

@class WorkletsURLSessionDelegate;

namespace worklets {

class AppleNetworkingBackend final : public NetworkingBackend {
 public:
  AppleNetworkingBackend();
  ~AppleNetworkingBackend() override;

  void sendRequest(uint64_t requestId, RequestConfig &&config, const std::shared_ptr<NetworkRequestListener> &listener)
      override;
  void abortRequest(uint64_t requestId) override;

 private:
  WorkletsURLSessionDelegate *delegate_;
};

} // namespace worklets

#endif // __cplusplus
