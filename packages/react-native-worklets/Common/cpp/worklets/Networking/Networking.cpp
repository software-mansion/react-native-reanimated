#include <worklets/Networking/Networking.h>
#include <worklets/SharedItems/SerializableRemoteFunction.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <functional>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

namespace {

class VectorBuffer final : public jsi::MutableBuffer {
 public:
  explicit VectorBuffer(std::vector<uint8_t> &&data) : data_(std::move(data)) {}

  size_t size() const override {
    return data_.size();
  }

  uint8_t *data() override {
    return data_.data();
  }

 private:
  std::vector<uint8_t> data_;
};

const char *errorName(const RequestError error) {
  switch (error) {
    case RequestError::Timeout:
      return "timeout";
    case RequestError::Aborted:
      return "aborted";
    case RequestError::Network:
    default:
      return "network";
  }
}

std::vector<std::pair<std::string, std::string>> parseHeaders(jsi::Runtime &rt, const jsi::Object &config) {
  std::vector<std::pair<std::string, std::string>> headers;
  auto headersArray = config.getProperty(rt, "headers").asObject(rt).asArray(rt);
  const auto length = headersArray.size(rt);
  headers.reserve(length);
  for (size_t i = 0; i < length; i++) {
    auto pair = headersArray.getValueAtIndex(rt, i).asObject(rt).asArray(rt);
    headers.emplace_back(
        pair.getValueAtIndex(rt, 0).asString(rt).utf8(rt), pair.getValueAtIndex(rt, 1).asString(rt).utf8(rt));
  }
  return headers;
}

std::optional<std::vector<uint8_t>> parseBody(jsi::Runtime &rt, const jsi::Object &config) {
  const auto body = config.getProperty(rt, "body");
  if (body.isString()) {
    const auto utf8 = body.asString(rt).utf8(rt);
    return std::vector<uint8_t>(utf8.begin(), utf8.end());
  }
  if (body.isObject()) {
    const auto bodyObject = body.asObject(rt);
    if (bodyObject.isArrayBuffer(rt)) {
      auto arrayBuffer = bodyObject.getArrayBuffer(rt);
      const auto *data = arrayBuffer.data(rt);
      return std::vector<uint8_t>(data, data + arrayBuffer.size(rt));
    }
  }
  return std::nullopt;
}

jsi::Value headersToJsi(jsi::Runtime &rt, const std::vector<std::pair<std::string, std::string>> &headers) {
  auto result = jsi::Array(rt, headers.size());
  for (size_t i = 0; i < headers.size(); i++) {
    auto pair = jsi::Array(rt, 2);
    pair.setValueAtIndex(rt, 0, jsi::String::createFromUtf8(rt, headers[i].first));
    pair.setValueAtIndex(rt, 1, jsi::String::createFromUtf8(rt, headers[i].second));
    result.setValueAtIndex(rt, i, std::move(pair));
  }
  return result;
}

void emitEvent(
    const std::weak_ptr<WorkletRuntime> &weakRuntime,
    const std::shared_ptr<SerializableRemoteFunction> &callback,
    const char *type,
    std::function<jsi::Value(jsi::Runtime &)> &&payloadFactory) {
  const auto workletRuntime = weakRuntime.lock();
  if (!workletRuntime) {
    return;
  }
  workletRuntime->schedule([callback, type, payloadFactory = std::move(payloadFactory)](jsi::Runtime &rt) mutable {
    callback->toJSValue(rt).asObject(rt).asFunction(rt).call(
        rt, jsi::String::createFromAscii(rt, type), payloadFactory(rt));
  });
}

} // namespace

class Networking::RequestListener final : public NetworkRequestListener {
 public:
  RequestListener(
      const std::weak_ptr<Networking> &weakNetworking,
      const std::shared_ptr<RequestRecord> &record,
      const std::shared_ptr<SerializableRemoteFunction> &callback,
      const uint64_t requestId)
      : weakNetworking_(weakNetworking), record_(record), callback_(callback), requestId_(requestId) {}

  void onResponse(ResponseInfo &&responseInfo) override {
    emitEvent(record_->weakRuntime, callback_, "response", [responseInfo = std::move(responseInfo)](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "status", jsi::Value(responseInfo.status));
      payload.setProperty(rt, "statusText", jsi::String::createFromUtf8(rt, responseInfo.statusText));
      payload.setProperty(rt, "headers", headersToJsi(rt, responseInfo.headers));
      payload.setProperty(rt, "url", jsi::String::createFromUtf8(rt, responseInfo.url));
      return jsi::Value(std::move(payload));
    });
  }

  void onUploadProgress(const int64_t sent, const int64_t total) override {
    emitProgress("uploadProgress", sent, total);
  }

  void onDownloadProgress(const int64_t received, const int64_t total) override {
    emitProgress("downloadProgress", received, total);
  }

  void onCompleteText(std::string &&body) override {
    if (settle()) {
      return;
    }
    emitEvent(record_->weakRuntime, callback_, "done", [body = std::move(body)](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "body", jsi::String::createFromUtf8(rt, body));
      return jsi::Value(std::move(payload));
    });
  }

  void onCompleteBytes(std::vector<uint8_t> &&body) override {
    if (settle()) {
      return;
    }
    emitEvent(record_->weakRuntime, callback_, "done", [body = std::move(body)](jsi::Runtime &rt) mutable {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "body", jsi::ArrayBuffer(rt, std::make_shared<VectorBuffer>(std::move(body))));
      return jsi::Value(std::move(payload));
    });
  }

  void onError(const RequestError error, std::string &&message) override {
    if (settle()) {
      return;
    }
    emitEvent(record_->weakRuntime, callback_, "done", [error, message = std::move(message)](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "error", jsi::String::createFromAscii(rt, errorName(error)));
      payload.setProperty(rt, "message", jsi::String::createFromUtf8(rt, message));
      return jsi::Value(std::move(payload));
    });
  }

 private:
  void emitProgress(const char *type, const int64_t loaded, const int64_t total) {
    if (record_->settled.load()) {
      return;
    }
    emitEvent(record_->weakRuntime, callback_, type, [loaded, total](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "loaded", jsi::Value(static_cast<double>(loaded)));
      payload.setProperty(rt, "total", jsi::Value(static_cast<double>(total)));
      return jsi::Value(std::move(payload));
    });
  }

  bool settle() {
    if (record_->settled.exchange(true)) {
      return true;
    }
    if (const auto networking = weakNetworking_.lock()) {
      networking->unregisterRequest(requestId_);
    }
    return false;
  }

  const std::weak_ptr<Networking> weakNetworking_;
  const std::shared_ptr<RequestRecord> record_;
  const std::shared_ptr<SerializableRemoteFunction> callback_;
  const uint64_t requestId_;
};

Networking::Networking(const std::shared_ptr<NetworkingBackend> &backend) : backend_(backend) {}

uint64_t Networking::sendRequest(jsi::Runtime &rt, const jsi::Object &config, jsi::Function &&callback) {
  const auto weakRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt);
  const auto workletRuntime = weakRuntime.lock();
  if (!workletRuntime) {
    throw jsi::JSError(rt, "[Worklets] Cannot send a request from a dying Worklet Runtime.");
  }

  const auto serializableCallback = std::make_shared<SerializableRemoteFunction>(
      rt, "workletsNetworkingCallback", std::move(callback), workletRuntime->getRuntimeId());

  RequestConfig requestConfig{
      .method = config.getProperty(rt, "method").asString(rt).utf8(rt),
      .url = config.getProperty(rt, "url").asString(rt).utf8(rt),
      .headers = parseHeaders(rt, config),
      .body = parseBody(rt, config),
      .responseKind = config.getProperty(rt, "responseKind").asString(rt).utf8(rt) == "bytes" ? ResponseKind::Bytes
                                                                                              : ResponseKind::Text,
      .timeoutMs = config.getProperty(rt, "timeoutMs").asNumber(),
      .withCredentials = config.getProperty(rt, "withCredentials").asBool(),
  };

  const auto requestId = nextRequestId_.fetch_add(1);
  const auto record = std::make_shared<RequestRecord>(weakRuntime, workletRuntime->getRuntimeId());
  {
    const std::lock_guard<std::mutex> lock(requestsMutex_);
    requests_.emplace(requestId, record);
  }

  backend_->sendRequest(
      requestId,
      std::move(requestConfig),
      std::make_shared<RequestListener>(weak_from_this(), record, serializableCallback, requestId));

  return requestId;
}

void Networking::abortRequest(jsi::Runtime &rt, const uint64_t requestId) {
  const auto workletRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt).lock();
  if (!workletRuntime) {
    return;
  }
  {
    const std::lock_guard<std::mutex> lock(requestsMutex_);
    const auto record = requests_.find(requestId);
    if (record == requests_.end() || record->second->runtimeId != workletRuntime->getRuntimeId()) {
      return;
    }
  }
  backend_->abortRequest(requestId);
}

void Networking::abortAllForRuntime(const RuntimeData::RuntimeId runtimeId) {
  std::vector<uint64_t> requestIds;
  {
    const std::lock_guard<std::mutex> lock(requestsMutex_);
    for (const auto &[requestId, record] : requests_) {
      if (record->runtimeId == runtimeId) {
        requestIds.push_back(requestId);
      }
    }
  }
  for (const auto requestId : requestIds) {
    backend_->abortRequest(requestId);
  }
}

void Networking::abortAll() {
  std::vector<uint64_t> requestIds;
  {
    const std::lock_guard<std::mutex> lock(requestsMutex_);
    requestIds.reserve(requests_.size());
    for (const auto &[requestId, record] : requests_) {
      requestIds.push_back(requestId);
    }
  }
  for (const auto requestId : requestIds) {
    backend_->abortRequest(requestId);
  }
}

void Networking::unregisterRequest(const uint64_t requestId) {
  const std::lock_guard<std::mutex> lock(requestsMutex_);
  requests_.erase(requestId);
}

} // namespace worklets
