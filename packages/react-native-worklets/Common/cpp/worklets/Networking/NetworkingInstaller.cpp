#include <worklets/Networking/NetworkingInstaller.h>
#include <worklets/Tools/WorkletsJSIUtils.h>

#include <algorithm>
#include <cctype>
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

// Code points for bytes 0x80-0x9F, where windows-1252 differs from Latin-1.
// The WHATWG Encoding Standard maps ASCII and ISO-8859-1 labels to
// windows-1252 as well.
constexpr uint16_t kWindows1252CodePoints[32] = {0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
                                                 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008D, 0x017D, 0x008F,
                                                 0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
                                                 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178};

void appendUtf8(std::string &result, const uint16_t codePoint) {
  if (codePoint < 0x80) {
    result.push_back(static_cast<char>(codePoint));
  } else if (codePoint < 0x800) {
    result.push_back(static_cast<char>(0xC0 | (codePoint >> 6)));
    result.push_back(static_cast<char>(0x80 | (codePoint & 0x3F)));
  } else {
    result.push_back(static_cast<char>(0xE0 | (codePoint >> 12)));
    result.push_back(static_cast<char>(0x80 | ((codePoint >> 6) & 0x3F)));
    result.push_back(static_cast<char>(0x80 | (codePoint & 0x3F)));
  }
}

jsi::Value decodeWindows1252(jsi::Runtime &rt, const uint8_t *data, const size_t size) {
  std::string result;
  result.reserve(size);
  for (size_t i = 0; i < size; i++) {
    const auto byte = data[i];
    if (byte >= 0x80 && byte < 0xA0) {
      appendUtf8(result, kWindows1252CodePoints[byte - 0x80]);
    } else {
      appendUtf8(result, byte);
    }
  }
  return jsi::String::createFromUtf8(rt, result);
}

bool isWindows1252Label(const std::string &encoding) {
  return encoding == "windows-1252" || encoding == "cp1252" || encoding == "x-cp1252" || encoding == "cp819" ||
      encoding == "iso-8859-1" || encoding == "iso8859-1" || encoding == "iso88591" || encoding == "latin1" ||
      encoding == "l1" || encoding == "ascii" || encoding == "us-ascii";
}

jsi::Value decodeText(jsi::Runtime &rt, const jsi::Value &bufferValue, const jsi::Value &encodingValue) {
  auto arrayBuffer = bufferValue.asObject(rt).getArrayBuffer(rt);
  const auto *data = arrayBuffer.data(rt);
  const auto size = arrayBuffer.size(rt);

  auto encoding = encodingValue.isString() ? encodingValue.asString(rt).utf8(rt) : std::string{};
  std::transform(encoding.begin(), encoding.end(), encoding.begin(), [](const unsigned char character) {
    return static_cast<char>(std::tolower(character));
  });

  if (isWindows1252Label(encoding)) {
    return decodeWindows1252(rt, data, size);
  }
  return jsi::String::createFromUtf8(rt, data, size);
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
        if (const auto networking = weakNetworking.lock()) {
          networking->abortRequest(rt, static_cast<uint64_t>(args[0].asNumber()));
        }
      });

  jsi_utils::addMethod<2>(
      rt,
      networkingObject,
      "decodeText",
      [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) -> jsi::Value {
        return decodeText(rt, args[0], args[1]);
      });

  rt.global().setProperty(rt, "__workletsNetworking", networkingObject);

  const auto guard = std::make_shared<NetworkingRuntimeGuard>(weakNetworking, runtimeId);
  rt.global().setProperty(rt, "__workletsNetworkingGuard", jsi::Object::createFromHostObject(rt, guard));
}

} // namespace worklets
