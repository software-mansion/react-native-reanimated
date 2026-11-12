#pragma once

#include <fbjni/fbjni.h>
#include <worklets/Networking/NetworkingBackend.h>

#include <memory>
#include <utility>

namespace worklets {

using namespace facebook;

class JWebSocketListener : public jni::HybridClass<JWebSocketListener> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/worklets/networking/WebSocketListener;";

  static void registerNatives();

  void onOpen(jni::alias_ref<jni::JString> protocol, jni::alias_ref<jni::JString> extensions);
  void onFlushed(jlong bytes);
  void onTextMessage(jni::alias_ref<jni::JString> message);
  void onBinaryMessage(jni::alias_ref<jni::JArrayByte> message);
  void onError(jni::alias_ref<jni::JString> message);
  void onClose(jint code, jni::alias_ref<jni::JString> reason, jboolean wasClean);

 private:
  friend HybridBase;

  explicit JWebSocketListener(std::shared_ptr<WebSocketListener> listener) : listener_(std::move(listener)) {}

  const std::shared_ptr<WebSocketListener> listener_;
};

} // namespace worklets
