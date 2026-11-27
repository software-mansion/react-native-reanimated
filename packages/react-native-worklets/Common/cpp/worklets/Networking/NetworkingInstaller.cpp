#include <worklets/Networking/NetworkingInstaller.h>
#include <worklets/Networking/TextDecoding.h>
#include <worklets/Tools/WorkletsJSIUtils.h>

#include <cmath>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace worklets {

namespace {

class NetworkingRuntimeGuard : public jsi::HostObject {
 public:
  NetworkingRuntimeGuard(std::weak_ptr<Networking> weakNetworking, const RuntimeData::RuntimeId runtimeId)
      : weakNetworking_(std::move(weakNetworking)), runtimeId_(runtimeId) {}

  ~NetworkingRuntimeGuard() override {
    if (const auto networking = weakNetworking_.lock()) {
      networking->abortAllForRuntime(runtimeId_);
    }
  }

 private:
  const std::weak_ptr<Networking> weakNetworking_;
  const RuntimeData::RuntimeId runtimeId_;
};

// https://encoding.spec.whatwg.org/#decode - a BOM overrides the declared
// encoding, so it is sniffed before the label is consulted.
std::string decodeWithLabel(
    const std::shared_ptr<Networking> &networking,
    const uint8_t *data,
    size_t size,
    const std::string &label) {
  if (size >= 2 && data[0] == 0xFE && data[1] == 0xFF) {
    return text::decodeUtf16(data + 2, size - 2, /*littleEndian*/ false);
  }
  if (size >= 2 && data[0] == 0xFF && data[1] == 0xFE) {
    return text::decodeUtf16(data + 2, size - 2, /*littleEndian*/ true);
  }
  if (size >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF) {
    data += 3;
    size -= 3;
    return text::decodeUtf8(data, size);
  }
  if (text::isUtf8Label(label)) {
    return text::decodeUtf8(data, size);
  }
  if (text::isWindows1252Label(label)) {
    return text::decodeWindows1252(data, size);
  }
  if (auto decoded = networking->decodeTextWithPlatform(data, size, label)) {
    return text::toValidUtf8(*decoded);
  }
  return text::decodeUtf8(data, size);
}

std::optional<uint64_t> toSocketId(const jsi::Value &value) {
  if (!value.isNumber()) {
    return std::nullopt;
  }
  const auto id = value.asNumber();
  if (!std::isfinite(id) || id < 1 || id >= 18446744073709551616.0 || std::trunc(id) != id) {
    return std::nullopt;
  }
  return static_cast<uint64_t>(id);
}

jsi::Value decodeText(
    jsi::Runtime &rt,
    const std::shared_ptr<Networking> &networking,
    const jsi::ArrayBuffer &arrayBuffer,
    const jsi::Value &encodingValue) {
  const auto label = text::normalizeEncodingLabel(encodingValue.isString() ? encodingValue.asString(rt).utf8(rt) : "");
  return jsi::String::createFromUtf8(
      rt, decodeWithLabel(networking, arrayBuffer.data(rt), arrayBuffer.size(rt), label));
}

} // namespace

void NetworkingInstaller::install(
    jsi::Runtime &rt,
    const std::shared_ptr<Networking> &networking,
    const RuntimeData::RuntimeId runtimeId) {
  const auto weakNetworking = std::weak_ptr<Networking>(networking);

  auto networkingObject = jsi::Object(rt);

  jsi_utils::addMethod(
      rt,
      networkingObject,
      "sendRequest",
      [weakNetworking](jsi::Runtime &rt, const jsi::Object &config, jsi::Function onEvent) -> jsi::Value {
        const auto networking = weakNetworking.lock();
        if (!networking) {
          throw jsi::JSError(rt, "[Worklets] The networking module is no longer available.");
        }
        const auto requestId = networking->sendRequest(rt, config, std::move(onEvent));
        return {static_cast<double>(requestId)};
      });

  jsi_utils::addMethod(rt, networkingObject, "abortRequest", [weakNetworking](jsi::Runtime &rt, double requestId) {
    if (!std::isfinite(requestId) || requestId < 1 || requestId >= 18446744073709551616.0 ||
        std::trunc(requestId) != requestId) {
      return;
    }
    if (const auto networking = weakNetworking.lock()) {
      networking->abortRequest(rt, static_cast<uint64_t>(requestId));
    }
  });

  jsi_utils::addMethod(
      rt,
      networkingObject,
      "decodeText",
      [weakNetworking](jsi::Runtime &rt, const jsi::ArrayBuffer &buffer, const jsi::Value &encoding) -> jsi::Value {
        const auto networking = weakNetworking.lock();
        if (!networking) {
          throw jsi::JSError(rt, "[Worklets] The networking module is no longer available.");
        }
        return decodeText(rt, networking, buffer, encoding);
      });

  jsi_utils::addMethod(
      rt,
      networkingObject,
      "connectWebSocket",
      [weakNetworking](jsi::Runtime &rt, const jsi::Object &config, jsi::Function onEvent) -> jsi::Value {
        const auto networking = weakNetworking.lock();
        if (!networking) {
          throw jsi::JSError(rt, "[Worklets] The networking module is no longer available.");
        }
        const auto socketId = networking->connectWebSocket(rt, config, std::move(onEvent));
        return {static_cast<double>(socketId)};
      });

  jsi_utils::addMethod(
      rt,
      networkingObject,
      "sendWebSocketMessage",
      [weakNetworking](jsi::Runtime &rt, const jsi::Value &socketIdValue, const jsi::Value &message) {
        const auto socketId = toSocketId(socketIdValue);
        if (!socketId) {
          return;
        }
        const auto networking = weakNetworking.lock();
        if (!networking) {
          return;
        }
        if (message.isString()) {
          networking->sendWebSocketText(rt, *socketId, message.asString(rt).utf8(rt));
          return;
        }
        if (!message.isObject()) {
          throw jsi::JSError(rt, "[Worklets] A WebSocket message must be a string or an ArrayBuffer.");
        }
        auto messageObject = message.asObject(rt);
        if (!messageObject.isArrayBuffer(rt)) {
          throw jsi::JSError(rt, "[Worklets] A WebSocket message must be a string or an ArrayBuffer.");
        }
        auto arrayBuffer = messageObject.getArrayBuffer(rt);
        const auto *data = arrayBuffer.data(rt);
        networking->sendWebSocketBinary(rt, *socketId, std::vector<uint8_t>(data, data + arrayBuffer.size(rt)));
      });

  jsi_utils::addMethod(
      rt,
      networkingObject,
      "closeWebSocket",
      [weakNetworking](
          jsi::Runtime &rt, const jsi::Value &socketIdValue, const jsi::Value &codeValue, const jsi::Value &reason) {
        const auto socketId = toSocketId(socketIdValue);
        if (!socketId) {
          return;
        }
        if (!codeValue.isNumber() || !reason.isString()) {
          return;
        }
        const auto code = codeValue.asNumber();
        if (!std::isfinite(code) || std::trunc(code) != code || code < 1000 || code > 4999) {
          return;
        }
        /**
         * https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1 - the codes an
         * endpoint may put on the wire, plus 1005 which the backends turn into
         * a Close frame with no body. The public `close()` is stricter; this
         * also carries the internal protocol-error close.
         */
        const auto closeCode = static_cast<int64_t>(code);
        const auto isReserved = (closeCode >= 1004 && closeCode <= 1006) || (closeCode >= 1015 && closeCode <= 2999);
        if (closeCode != 1005 && (closeCode < 1000 || closeCode > 4999 || isReserved)) {
          return;
        }
        if (const auto networking = weakNetworking.lock()) {
          networking->closeWebSocket(rt, *socketId, static_cast<uint16_t>(code), reason.asString(rt).utf8(rt));
        }
      });

  rt.global().setProperty(rt, "__workletsNetworking", networkingObject);

  const auto guard = std::make_shared<NetworkingRuntimeGuard>(weakNetworking, runtimeId);
  rt.global().setProperty(rt, "__workletsNetworkingGuard", jsi::Object::createFromHostObject(rt, guard));
}

} // namespace worklets
