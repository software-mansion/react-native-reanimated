#include <worklets/android/networking/AndroidNetworkingBackend.h>
#include <worklets/android/networking/JNetworkRequestListener.h>

#include <optional>
#include <string>
#include <utility>

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
