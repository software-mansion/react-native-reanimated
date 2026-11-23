#include <worklets/android/networking/JWebSocketListener.h>

#include <string>
#include <utility>
#include <vector>

namespace worklets {

void JWebSocketListener::onOpen(
    jni::alias_ref<jni::JString> protocol, // NOLINT //(performance-unnecessary-value-param)
    jni::alias_ref<jni::JString> extensions // NOLINT //(performance-unnecessary-value-param)
) {
  listener_->onOpen(protocol->toStdString(), extensions->toStdString());
}

void JWebSocketListener::onFlushed(jlong bytes) {
  listener_->onFlushed(bytes);
}

void JWebSocketListener::onTextMessage(
    jni::alias_ref<jni::JString> message // NOLINT //(performance-unnecessary-value-param)
) {
  listener_->onTextMessage(message->toStdString());
}

void JWebSocketListener::onBinaryMessage(
    jni::alias_ref<jni::JArrayByte> message // NOLINT //(performance-unnecessary-value-param)
) {
  const auto size = message->size();
  std::vector<uint8_t> bytes(size);
  message->getRegion(0, size, reinterpret_cast<jbyte *>(bytes.data()));
  listener_->onBinaryMessage(std::move(bytes));
}

void JWebSocketListener::onError(jni::alias_ref<jni::JString> message // NOLINT //(performance-unnecessary-value-param)
) {
  listener_->onError(message->toStdString());
}

void JWebSocketListener::onClose(
    jint code,
    jni::alias_ref<jni::JString> reason, // NOLINT //(performance-unnecessary-value-param)
    jboolean wasClean) {
  listener_->onClose(static_cast<uint16_t>(code), reason->toStdString(), wasClean == JNI_TRUE);
}

void JWebSocketListener::registerNatives() {
  registerHybrid(
      {makeNativeMethod("onOpen", JWebSocketListener::onOpen),
       makeNativeMethod("onFlushed", JWebSocketListener::onFlushed),
       makeNativeMethod("onTextMessage", JWebSocketListener::onTextMessage),
       makeNativeMethod("onBinaryMessage", JWebSocketListener::onBinaryMessage),
       makeNativeMethod("onError", JWebSocketListener::onError),
       makeNativeMethod("onClose", JWebSocketListener::onClose)});
}

} // namespace worklets
