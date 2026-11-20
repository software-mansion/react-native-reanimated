#include <worklets/android/networking/AndroidNetworkingBackend.h>
#include <worklets/android/networking/JNetworkRequestListener.h>
#include <worklets/android/networking/JWebSocketListener.h>

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

AndroidNetworkingBackend::AndroidNetworkingBackend(jni::global_ref<JNetworking::javaobject> networking)
    : networking_(std::move(networking)) {}

void AndroidNetworkingBackend::sendRequest(
    const uint64_t requestId,
    RequestConfig &&config,
    const std::shared_ptr<NetworkRequestListener> &listener) {
  jni::ThreadScope::WithClassLoader([&] {
    static const auto jSendRequest = networking_->getClass()
                                         ->getMethod<void(
                                             jdouble,
                                             std::string,
                                             std::string,
                                             jni::JArrayClass<jni::JString>::javaobject,
                                             jni::JArrayClass<jni::JString>::javaobject,
                                             jni::JArrayByte::javaobject,
                                             jdouble,
                                             jboolean,
                                             JNetworkRequestListener::javaobject)>("sendRequest");

    const auto headersSize = config.headers.size();
    auto headerNames = jni::JArrayClass<jni::JString>::newArray(headersSize);
    auto headerValues = jni::JArrayClass<jni::JString>::newArray(headersSize);
    for (size_t i = 0; i < headersSize; i++) {
      headerNames->setElement(i, *jni::make_jstring(config.headers[i].first));
      headerValues->setElement(i, *jni::make_jstring(config.headers[i].second));
    }

    jni::local_ref<jni::JArrayByte> body = nullptr;
    if (config.body.has_value()) {
      body = jni::JArrayByte::newArray(config.body->size());
      body->setRegion(0, config.body->size(), reinterpret_cast<const jbyte *>(config.body->data()));
    }

    jSendRequest(
        networking_.get(),
        static_cast<jdouble>(requestId),
        config.method,
        config.url,
        headerNames.get(),
        headerValues.get(),
        body.get(),
        config.timeoutMs,
        config.withCredentials,
        JNetworkRequestListener::newObjectCxxArgs(listener).get());
  });
}

void AndroidNetworkingBackend::connectWebSocket(
    const uint64_t socketId,
    WebSocketConfig &&config,
    const std::shared_ptr<WebSocketListener> &listener) {
  jni::ThreadScope::WithClassLoader([&] {
    static const auto jConnect = networking_->getClass()
                                     ->getMethod<void(
                                         jdouble,
                                         std::string,
                                         jni::JArrayClass<jni::JString>::javaobject,
                                         jni::JArrayClass<jni::JString>::javaobject,
                                         jni::JArrayClass<jni::JString>::javaobject,
                                         JWebSocketListener::javaobject)>("connectWebSocket");

    auto protocols = jni::JArrayClass<jni::JString>::newArray(config.protocols.size());
    for (size_t i = 0; i < config.protocols.size(); i++) {
      protocols->setElement(i, *jni::make_jstring(config.protocols[i]));
    }

    const auto headersSize = config.headers.size();
    auto headerNames = jni::JArrayClass<jni::JString>::newArray(headersSize);
    auto headerValues = jni::JArrayClass<jni::JString>::newArray(headersSize);
    for (size_t i = 0; i < headersSize; i++) {
      headerNames->setElement(i, *jni::make_jstring(config.headers[i].first));
      headerValues->setElement(i, *jni::make_jstring(config.headers[i].second));
    }

    jConnect(
        networking_.get(),
        static_cast<jdouble>(socketId),
        config.url,
        protocols.get(),
        headerNames.get(),
        headerValues.get(),
        JWebSocketListener::newObjectCxxArgs(listener).get());
  });
}

void AndroidNetworkingBackend::sendWebSocketText(const uint64_t socketId, std::string &&message) {
  jni::ThreadScope::WithClassLoader([&] {
    /**
     * The text is passed as bytes because JNI strings use modified UTF-8, which
     * ends at the first NUL and would silently truncate the frame.
     */
    static const auto jSendText =
        networking_->getClass()->getMethod<void(jdouble, jni::JArrayByte::javaobject)>("sendWebSocketText");
    auto bytes = jni::JArrayByte::newArray(message.size());
    bytes->setRegion(0, message.size(), reinterpret_cast<const jbyte *>(message.data()));
    jSendText(networking_.get(), static_cast<jdouble>(socketId), bytes.get());
  });
}

void AndroidNetworkingBackend::sendWebSocketBinary(const uint64_t socketId, std::vector<uint8_t> &&message) {
  jni::ThreadScope::WithClassLoader([&] {
    static const auto jSendBinary =
        networking_->getClass()->getMethod<void(jdouble, jni::JArrayByte::javaobject)>("sendWebSocketBinary");
    auto bytes = jni::JArrayByte::newArray(message.size());
    bytes->setRegion(0, message.size(), reinterpret_cast<const jbyte *>(message.data()));
    jSendBinary(networking_.get(), static_cast<jdouble>(socketId), bytes.get());
  });
}

void AndroidNetworkingBackend::closeWebSocket(const uint64_t socketId, const uint16_t code, std::string &&reason) {
  jni::ThreadScope::WithClassLoader([&] {
    static const auto jClose = networking_->getClass()->getMethod<void(jdouble, jint, std::string)>("closeWebSocket");
    jClose(networking_.get(), static_cast<jdouble>(socketId), static_cast<jint>(code), reason);
  });
}

std::optional<std::string>
AndroidNetworkingBackend::decodeText(const uint8_t *data, const size_t size, const std::string &label) {
  std::optional<std::string> result;
  jni::ThreadScope::WithClassLoader([&] {
    static const auto jDecodeText =
        networking_->getClass()->getMethod<jni::JString::javaobject(jni::JArrayByte::javaobject, std::string)>(
            "decodeText");
    auto bytes = jni::JArrayByte::newArray(size);
    bytes->setRegion(0, size, reinterpret_cast<const jbyte *>(data));
    const auto decoded = jDecodeText(networking_.get(), bytes.get(), label);
    if (decoded) {
      result = decoded->toStdString();
    }
  });
  return result;
}

void AndroidNetworkingBackend::abortRequest(const uint64_t requestId) {
  jni::ThreadScope::WithClassLoader([&] {
    static const auto jAbortRequest = networking_->getClass()->getMethod<void(jdouble)>("abortRequest");
    jAbortRequest(networking_.get(), static_cast<jdouble>(requestId));
  });
}

} // namespace worklets
