#include <worklets/android/networking/AndroidNetworkingBackend.h>
#include <worklets/android/networking/JNetworkRequestListener.h>

#include <string>
#include <utility>

namespace worklets {

AndroidNetworkingBackend::AndroidNetworkingBackend(jni::global_ref<JWorkletsNetworking::javaobject> workletsNetworking)
    : workletsNetworking_(std::move(workletsNetworking)) {}

void AndroidNetworkingBackend::sendRequest(
    const uint64_t requestId,
    RequestConfig &&config,
    const std::shared_ptr<NetworkRequestListener> &listener) {
  jni::ThreadScope::WithClassLoader([&] {
    static const auto jSendRequest = workletsNetworking_->getClass()
                                         ->getMethod<void(
                                             jdouble,
                                             std::string,
                                             std::string,
                                             jni::JArrayClass<jni::JString>::javaobject,
                                             jni::JArrayClass<jni::JString>::javaobject,
                                             jni::JArrayByte::javaobject,
                                             jboolean,
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
        workletsNetworking_.get(),
        static_cast<jdouble>(requestId),
        config.method,
        config.url,
        headerNames.get(),
        headerValues.get(),
        body.get(),
        config.responseKind == ResponseKind::Bytes,
        config.timeoutMs,
        config.withCredentials,
        JNetworkRequestListener::newObjectCxxArgs(listener).get());
  });
}

void AndroidNetworkingBackend::abortRequest(const uint64_t requestId) {
  jni::ThreadScope::WithClassLoader([&] {
    static const auto jAbortRequest = workletsNetworking_->getClass()->getMethod<void(jdouble)>("abortRequest");
    jAbortRequest(workletsNetworking_.get(), static_cast<jdouble>(requestId));
  });
}

} // namespace worklets
