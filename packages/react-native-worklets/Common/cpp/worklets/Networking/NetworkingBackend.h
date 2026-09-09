#pragma once

#include <worklets/Networking/NetworkingTypes.h>

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace worklets {

/**
 * Implemented by the networking core. Backends may invoke the methods from any
 * thread. Exactly one of `onCompleteText`, `onCompleteBytes` or `onError` must
 * be invoked per request, as the last call for that request.
 */
class NetworkRequestListener {
 public:
  virtual void onResponse(ResponseInfo &&responseInfo) = 0;
  virtual void onUploadProgress(int64_t sent, int64_t total) = 0;
  virtual void onDownloadProgress(int64_t received, int64_t total) = 0;
  virtual void onCompleteText(std::string &&body) = 0;
  virtual void onCompleteBytes(std::vector<uint8_t> &&body) = 0;
  virtual void onError(RequestError error, std::string &&message) = 0;
  virtual ~NetworkRequestListener() = default;
};

class NetworkingBackend {
 public:
  virtual void
  sendRequest(uint64_t requestId, RequestConfig &&config, const std::shared_ptr<NetworkRequestListener> &listener) = 0;
  virtual void abortRequest(uint64_t requestId) = 0;
  virtual ~NetworkingBackend() = default;
};

} // namespace worklets
