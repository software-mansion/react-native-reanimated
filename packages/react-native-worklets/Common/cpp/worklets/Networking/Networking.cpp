#include <worklets/Networking/Networking.h>
#include <worklets/Networking/TextDecoding.h>
#include <worklets/SharedItems/Serializable/SerializableRemoteFunction.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <react/debug/react_native_assert.h>

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
    pair.setValueAtIndex(rt, 0, jsi::String::createFromUtf8(rt, text::toValidUtf8(headers[i].first)));
    pair.setValueAtIndex(rt, 1, jsi::String::createFromUtf8(rt, text::toValidUtf8(headers[i].second)));
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

  ~RequestListener() override {
    if (!callback_) {
      return;
    }
    const auto workletRuntime = record_->weakRuntime.lock();
    if (!workletRuntime) {
      return;
    }
    workletRuntime->schedule([callback = std::move(callback_)](jsi::Runtime &) {});
  }

  void onResponse(ResponseInfo &&responseInfo) override {
    emitEvent(record_->weakRuntime, callback_, "response", [responseInfo = std::move(responseInfo)](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "status", jsi::Value(responseInfo.status));
      payload.setProperty(
          rt, "statusText", jsi::String::createFromUtf8(rt, text::toValidUtf8(responseInfo.statusText)));
      payload.setProperty(rt, "headers", headersToJsi(rt, responseInfo.headers));
      payload.setProperty(rt, "url", jsi::String::createFromUtf8(rt, text::toValidUtf8(responseInfo.url)));
      return jsi::Value(std::move(payload));
    });
  }

  void onUploadProgress(const int64_t sent, const int64_t total) override {
    emitProgress("uploadProgress", sent, total);
  }

  void onDownloadProgress(const int64_t received, const int64_t total) override {
    emitProgress("downloadProgress", received, total);
  }

  void onComplete(std::vector<uint8_t> &&body) override {
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
      payload.setProperty(rt, "message", jsi::String::createFromUtf8(rt, text::toValidUtf8(message)));
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
  std::shared_ptr<SerializableRemoteFunction> callback_;
  const uint64_t requestId_;
};

class Networking::SocketListener final : public WebSocketListener {
 public:
  SocketListener(
      const std::weak_ptr<Networking> &weakNetworking,
      const std::shared_ptr<RequestRecord> &record,
      const std::shared_ptr<SerializableRemoteFunction> &callback,
      const uint64_t socketId)
      : weakNetworking_(weakNetworking), record_(record), callback_(callback), socketId_(socketId) {}

  ~SocketListener() override {
    if (!callback_) {
      return;
    }
    const auto workletRuntime = record_->weakRuntime.lock();
    if (!workletRuntime) {
      return;
    }
    workletRuntime->schedule([callback = std::move(callback_)](jsi::Runtime &) {});
  }

  void onOpen(std::string &&protocol, std::string &&extensions) override {
    if (record_->settled.load()) {
      return;
    }
    emitEvent(
        record_->weakRuntime,
        callback_,
        "open",
        [protocol = std::move(protocol), extensions = std::move(extensions)](jsi::Runtime &rt) {
          auto payload = jsi::Object(rt);
          payload.setProperty(rt, "protocol", jsi::String::createFromUtf8(rt, text::toValidUtf8(protocol)));
          payload.setProperty(rt, "extensions", jsi::String::createFromUtf8(rt, text::toValidUtf8(extensions)));
          return jsi::Value(std::move(payload));
        });
  }

  void onFlushed(const int64_t bytes) override {
    if (record_->settled.load()) {
      return;
    }
    emitEvent(record_->weakRuntime, callback_, "flushed", [bytes](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "bytes", jsi::Value(static_cast<double>(bytes)));
      return jsi::Value(std::move(payload));
    });
  }

  void onTextMessage(std::string &&message) override {
    if (record_->settled.load()) {
      return;
    }
    emitEvent(record_->weakRuntime, callback_, "message", [message = std::move(message)](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "text", jsi::String::createFromUtf8(rt, text::toValidUtf8(message)));
      return jsi::Value(std::move(payload));
    });
  }

  void onBinaryMessage(std::vector<uint8_t> &&message) override {
    if (record_->settled.load()) {
      return;
    }
    emitEvent(record_->weakRuntime, callback_, "message", [message = std::move(message)](jsi::Runtime &rt) mutable {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "binary", jsi::ArrayBuffer(rt, std::make_shared<VectorBuffer>(std::move(message))));
      return jsi::Value(std::move(payload));
    });
  }

  void onError(std::string &&message) override {
    if (record_->settled.load()) {
      return;
    }
    emitEvent(record_->weakRuntime, callback_, "error", [message = std::move(message)](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "message", jsi::String::createFromUtf8(rt, text::toValidUtf8(message)));
      return jsi::Value(std::move(payload));
    });
  }

  void onClose(const uint16_t code, std::string &&reason, const bool wasClean) override {
    if (record_->settled.exchange(true)) {
      return;
    }
    if (const auto networking = weakNetworking_.lock()) {
      networking->unregisterSocket(socketId_);
    }
    emitEvent(record_->weakRuntime, callback_, "close", [code, reason = std::move(reason), wasClean](jsi::Runtime &rt) {
      auto payload = jsi::Object(rt);
      payload.setProperty(rt, "code", jsi::Value(static_cast<double>(code)));
      payload.setProperty(rt, "reason", jsi::String::createFromUtf8(rt, text::toValidUtf8(reason)));
      payload.setProperty(rt, "wasClean", jsi::Value(wasClean));
      return jsi::Value(std::move(payload));
    });
  }

 private:
  const std::weak_ptr<Networking> weakNetworking_;
  const std::shared_ptr<RequestRecord> record_;
  std::shared_ptr<SerializableRemoteFunction> callback_;
  const uint64_t socketId_;
};

Networking::Networking(const std::shared_ptr<NetworkingBackend> &backend) : backend_(backend) {}

uint64_t Networking::sendRequest(jsi::Runtime &rt, const jsi::Object &config, jsi::Function &&callback) {
  const auto weakRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt);
  const auto workletRuntime = weakRuntime.lock();
  if (!workletRuntime) {
    throw jsi::JSError(rt, "[Worklets] Cannot send a request from a dying Worklet Runtime.");
  }

  const auto *hostIdentity = findRuntimeIdentity(rt);
  react_native_assert(hostIdentity != nullptr && "[Worklets] A Worklet Runtime must have a runtime identity.");

  const auto serializableCallback = std::make_shared<SerializableRemoteFunction>(
      rt, "workletsNetworkingCallback", std::move(callback), *hostIdentity);

  RequestConfig requestConfig{
      .method = config.getProperty(rt, "method").asString(rt).utf8(rt),
      .url = config.getProperty(rt, "url").asString(rt).utf8(rt),
      .headers = parseHeaders(rt, config),
      .body = parseBody(rt, config),
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

  if (workletRuntime->isAborted()) [[unlikely]] {
    backend_->abortRequest(requestId);
  }

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
  std::vector<uint64_t> socketIds;
  {
    const std::lock_guard<std::mutex> lock(socketsMutex_);
    for (const auto &[socketId, record] : sockets_) {
      if (record->runtimeId == runtimeId) {
        socketIds.push_back(socketId);
      }
    }
  }
  for (const auto socketId : socketIds) {
    backend_->closeWebSocket(socketId, static_cast<uint16_t>(WebSocketCloseCode::NoStatusReceived), "");
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
  std::vector<uint64_t> socketIds;
  {
    const std::lock_guard<std::mutex> lock(socketsMutex_);
    socketIds.reserve(sockets_.size());
    for (const auto &[socketId, record] : sockets_) {
      socketIds.push_back(socketId);
    }
  }
  for (const auto socketId : socketIds) {
    backend_->closeWebSocket(socketId, static_cast<uint16_t>(WebSocketCloseCode::NoStatusReceived), "");
  }
}

std::optional<std::string>
Networking::decodeTextWithPlatform(const uint8_t *data, const size_t size, const std::string &label) {
  return backend_->decodeText(data, size, label);
}

uint64_t Networking::connectWebSocket(jsi::Runtime &rt, const jsi::Object &config, jsi::Function &&callback) {
  const auto weakRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt);
  const auto workletRuntime = weakRuntime.lock();
  if (!workletRuntime) {
    throw jsi::JSError(rt, "[Worklets] Cannot open a WebSocket from a dying Worklet Runtime.");
  }

  const auto serializableCallback = std::make_shared<SerializableRemoteFunction>(
      rt, "workletsWebSocketCallback", std::move(callback), workletRuntime->getRuntimeId());

  std::vector<std::string> protocols;
  auto protocolsArray = config.getProperty(rt, "protocols").asObject(rt).asArray(rt);
  const auto protocolCount = protocolsArray.size(rt);
  protocols.reserve(protocolCount);
  for (size_t i = 0; i < protocolCount; i++) {
    protocols.push_back(protocolsArray.getValueAtIndex(rt, i).asString(rt).utf8(rt));
  }

  WebSocketConfig socketConfig{
      .url = config.getProperty(rt, "url").asString(rt).utf8(rt),
      .protocols = std::move(protocols),
      .headers = parseHeaders(rt, config),
  };

  const auto socketId = nextSocketId_.fetch_add(1);
  const auto record = std::make_shared<RequestRecord>(weakRuntime, workletRuntime->getRuntimeId());
  {
    const std::lock_guard<std::mutex> lock(socketsMutex_);
    sockets_.emplace(socketId, record);
  }

  backend_->connectWebSocket(
      socketId,
      std::move(socketConfig),
      std::make_shared<SocketListener>(weak_from_this(), record, serializableCallback, socketId));

  return socketId;
}

void Networking::sendWebSocketText(jsi::Runtime &rt, const uint64_t socketId, std::string &&message) {
  if (ownsSocket(rt, socketId)) {
    backend_->sendWebSocketText(socketId, std::move(message));
  }
}

void Networking::sendWebSocketBinary(jsi::Runtime &rt, const uint64_t socketId, std::vector<uint8_t> &&message) {
  if (ownsSocket(rt, socketId)) {
    backend_->sendWebSocketBinary(socketId, std::move(message));
  }
}

void Networking::closeWebSocket(jsi::Runtime &rt, const uint64_t socketId, const uint16_t code, std::string &&reason) {
  if (ownsSocket(rt, socketId)) {
    backend_->closeWebSocket(socketId, code, std::move(reason));
  }
}

bool Networking::ownsSocket(jsi::Runtime &rt, const uint64_t socketId) {
  const auto workletRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt).lock();
  if (!workletRuntime) {
    return false;
  }
  const std::lock_guard<std::mutex> lock(socketsMutex_);
  const auto record = sockets_.find(socketId);
  return record != sockets_.end() && record->second->runtimeId == workletRuntime->getRuntimeId();
}

void Networking::unregisterSocket(const uint64_t socketId) {
  const std::lock_guard<std::mutex> lock(socketsMutex_);
  sockets_.erase(socketId);
}

void Networking::unregisterRequest(const uint64_t requestId) {
  const std::lock_guard<std::mutex> lock(requestsMutex_);
  requests_.erase(requestId);
}

} // namespace worklets
