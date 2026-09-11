#include <worklets/android/networking/JNetworkRequestListener.h>

#include <string>
#include <utility>
#include <vector>

namespace worklets {

void JNetworkRequestListener::onResponse(
    jint status,
    jni::alias_ref<jni::JString> statusText, // NOLINT //(performance-unnecessary-value-param)
    jni::alias_ref<jni::JArrayClass<jni::JString>> headerNames, // NOLINT //(performance-unnecessary-value-param)
    jni::alias_ref<jni::JArrayClass<jni::JString>> headerValues, // NOLINT //(performance-unnecessary-value-param)
    jni::alias_ref<jni::JString> url // NOLINT //(performance-unnecessary-value-param)
) {
  ResponseInfo responseInfo;
  responseInfo.status = status;
  responseInfo.statusText = statusText->toStdString();
  const auto size = headerNames->size();
  responseInfo.headers.reserve(size);
  for (size_t i = 0; i < size; i++) {
    responseInfo.headers.emplace_back(
        headerNames->getElement(i)->toStdString(), headerValues->getElement(i)->toStdString());
  }
  responseInfo.url = url->toStdString();
  listener_->onResponse(std::move(responseInfo));
}

void JNetworkRequestListener::onUploadProgress(jlong sent, jlong total) {
  listener_->onUploadProgress(sent, total);
}

void JNetworkRequestListener::onDownloadProgress(jlong received, jlong total) {
  listener_->onDownloadProgress(received, total);
}

void JNetworkRequestListener::onCompleteText(
    jni::alias_ref<jni::JString> body // NOLINT //(performance-unnecessary-value-param)
) {
  listener_->onCompleteText(body->toStdString());
}

void JNetworkRequestListener::onCompleteBytes(
    jni::alias_ref<jni::JArrayByte> body // NOLINT //(performance-unnecessary-value-param)
) {
  const auto size = body->size();
  std::vector<uint8_t> bytes(size);
  body->getRegion(0, size, reinterpret_cast<jbyte *>(bytes.data()));
  listener_->onCompleteBytes(std::move(bytes));
}

void JNetworkRequestListener::onError(
    jint errorCode,
    jni::alias_ref<jni::JString> message // NOLINT //(performance-unnecessary-value-param)
) {
  auto error = RequestError::Network;
  if (errorCode == 1) {
    error = RequestError::Timeout;
  } else if (errorCode == 2) {
    error = RequestError::Aborted;
  }
  listener_->onError(error, message->toStdString());
}

void JNetworkRequestListener::registerNatives() {
  registerHybrid(
      {makeNativeMethod("onResponse", JNetworkRequestListener::onResponse),
       makeNativeMethod("onUploadProgress", JNetworkRequestListener::onUploadProgress),
       makeNativeMethod("onDownloadProgress", JNetworkRequestListener::onDownloadProgress),
       makeNativeMethod("onCompleteText", JNetworkRequestListener::onCompleteText),
       makeNativeMethod("onCompleteBytes", JNetworkRequestListener::onCompleteBytes),
       makeNativeMethod("onError", JNetworkRequestListener::onError)});
}

} // namespace worklets
