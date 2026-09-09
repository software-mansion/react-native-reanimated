#import <worklets/apple/Networking/AppleNetworkingBackend.h>
#import <worklets/apple/Networking/WorkletsURLSessionDelegate.h>

#import <utility>

namespace worklets {

AppleNetworkingBackend::AppleNetworkingBackend() : delegate_([WorkletsURLSessionDelegate new]) {}

AppleNetworkingBackend::~AppleNetworkingBackend()
{
  [delegate_ invalidate];
}

void AppleNetworkingBackend::sendRequest(
    const uint64_t requestId,
    RequestConfig &&config,
    const std::shared_ptr<NetworkRequestListener> &listener)
{
  [delegate_ sendRequest:std::move(config) requestId:requestId listener:listener];
}

void AppleNetworkingBackend::abortRequest(const uint64_t requestId)
{
  [delegate_ abortRequest:requestId];
}

} // namespace worklets
