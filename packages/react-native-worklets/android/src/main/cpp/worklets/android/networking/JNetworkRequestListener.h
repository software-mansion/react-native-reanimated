#pragma once

#include <fbjni/fbjni.h>
#include <worklets/Networking/NetworkingBackend.h>

#include <memory>
#include <utility>

namespace worklets {

using namespace facebook;

class JNetworkRequestListener : public jni::HybridClass<JNetworkRequestListener> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/worklets/networking/NetworkRequestListener;";

  static void registerNatives();

  void onResponse(
      jint status,
      jni::alias_ref<jni::JString> statusText,
      jni::alias_ref<jni::JArrayClass<jni::JString>> headerNames,
      jni::alias_ref<jni::JArrayClass<jni::JString>> headerValues,
      jni::alias_ref<jni::JString> url);
  void onUploadProgress(jlong sent, jlong total);
  void onDownloadProgress(jlong received, jlong total);
  void onCompleteText(jni::alias_ref<jni::JString> body);
  void onCompleteBytes(jni::alias_ref<jni::JArrayByte> body);
  void onError(jint errorCode, jni::alias_ref<jni::JString> message);

 private:
  friend HybridBase;

  explicit JNetworkRequestListener(std::shared_ptr<NetworkRequestListener> listener) : listener_(std::move(listener)) {}

  const std::shared_ptr<NetworkRequestListener> listener_;
};

} // namespace worklets
