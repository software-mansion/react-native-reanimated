#include <worklets/Networking/NetworkingInstaller.h>
#include <worklets/Networking/TextDecoding.h>
#include <worklets/Tools/WorkletsJSIUtils.h>

#include <cmath>
#include <cstdint>
#include <memory>
#include <string>

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

jsi::Value decodeText(
    jsi::Runtime &rt,
    const std::shared_ptr<Networking> &networking,
    const jsi::Value &bufferValue,
    const jsi::Value &encodingValue) {
  auto arrayBuffer = bufferValue.asObject(rt).getArrayBuffer(rt);
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

  jsi_utils::addMethod<2>(
      rt,
      networkingObject,
      "sendRequest",
      [weakNetworking](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) -> jsi::Value {
        const auto networking = weakNetworking.lock();
        if (!networking) {
          throw jsi::JSError(rt, "[Worklets] The networking module is no longer available.");
        }
        const auto requestId = networking->sendRequest(rt, args[0].asObject(rt), args[1].asObject(rt).asFunction(rt));
        return {static_cast<double>(requestId)};
      });

  jsi_utils::addMethod<1>(
      rt,
      networkingObject,
      "abortRequest",
      [weakNetworking](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        const auto requestId = args[0].asNumber();
        if (!std::isfinite(requestId) || requestId < 1 || requestId >= 18446744073709551616.0 ||
            std::trunc(requestId) != requestId) {
          return;
        }
        if (const auto networking = weakNetworking.lock()) {
          networking->abortRequest(rt, static_cast<uint64_t>(requestId));
        }
      });

  jsi_utils::addMethod<2>(
      rt,
      networkingObject,
      "decodeText",
      [weakNetworking](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) -> jsi::Value {
        const auto networking = weakNetworking.lock();
        if (!networking) {
          throw jsi::JSError(rt, "[Worklets] The networking module is no longer available.");
        }
        return decodeText(rt, networking, args[0], args[1]);
      });

  rt.global().setProperty(rt, "__workletsNetworking", networkingObject);

  const auto guard = std::make_shared<NetworkingRuntimeGuard>(weakNetworking, runtimeId);
  rt.global().setProperty(rt, "__workletsNetworkingGuard", jsi::Object::createFromHostObject(rt, guard));
}

} // namespace worklets
