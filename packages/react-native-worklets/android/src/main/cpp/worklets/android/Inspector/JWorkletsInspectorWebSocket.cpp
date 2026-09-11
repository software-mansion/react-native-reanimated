#include <worklets/android/Inspector/JWorkletsInspectorWebSocket.h>

#include <fbjni/NativeRunnable.h>

#include <memory>
#include <optional>
#include <string>
#include <utility>

namespace worklets {

using namespace facebook;

void JWorkletsInspectorWebSocket::registerNatives() {
  registerHybrid({
      makeNativeMethod("didOpen", JWorkletsInspectorWebSocket::didOpen),
      makeNativeMethod("didReceiveMessage", JWorkletsInspectorWebSocket::didReceiveMessage),
      makeNativeMethod("didClose", JWorkletsInspectorWebSocket::didClose),
      makeNativeMethod("didFailWithError", JWorkletsInspectorWebSocket::didFailWithError),
  });
}

void JWorkletsInspectorWebSocket::didOpen() {
  if (auto delegate = delegate_.lock()) {
    delegate->didOpen();
  }
}

void JWorkletsInspectorWebSocket::didReceiveMessage(jni::alias_ref<jni::JString> message) {
  if (auto delegate = delegate_.lock()) {
    delegate->didReceiveMessage(message->toStdString());
  }
}

void JWorkletsInspectorWebSocket::didClose() {
  if (auto delegate = delegate_.lock()) {
    delegate->didClose();
  }
}

void JWorkletsInspectorWebSocket::didFailWithError(jni::alias_ref<jni::JString> error) {
  if (auto delegate = delegate_.lock()) {
    delegate->didFailWithError(std::nullopt, error->toStdString());
  }
}

AndroidInspectorWebSocket::AndroidInspectorWebSocket(
    const std::string &url,
    std::weak_ptr<react::jsinspector_modern::IWebSocketDelegate> delegate)
    : javaWebSocket_(jni::make_global(JWorkletsInspectorWebSocket::newObjectCxxArgs(std::move(delegate)))) {
  static const auto connectMethod =
      javaWebSocket_->getClass()->getMethod<void(jni::local_ref<jni::JString>)>("connect");
  connectMethod(javaWebSocket_, jni::make_jstring(url));
}

AndroidInspectorWebSocket::~AndroidInspectorWebSocket() {
  jni::ThreadScope threadScope;
  static const auto closeMethod = javaWebSocket_->getClass()->getMethod<void()>("close");
  closeMethod(javaWebSocket_);
}

void AndroidInspectorWebSocket::send(std::string_view message) {
  jni::ThreadScope threadScope;
  static const auto sendMethod = javaWebSocket_->getClass()->getMethod<void(jni::local_ref<jni::JString>)>("send");
  sendMethod(javaWebSocket_, jni::make_jstring(std::string(message)));
}

struct JWorkletsInspectorMainThread : public jni::JavaClass<JWorkletsInspectorMainThread> {
  static constexpr auto kJavaDescriptor = "Lcom/swmansion/worklets/inspector/WorkletsInspectorMainThread;";
};

react::jsinspector_modern::VoidExecutor makeAndroidMainThreadExecutor() {
  return [](std::function<void()> &&callback) {
    jni::ThreadScope threadScope;
    static const auto postMethod = JWorkletsInspectorMainThread::javaClassStatic()
                                       ->getStaticMethod<void(jni::alias_ref<jni::JRunnable::javaobject>)>("post");
    postMethod(
        JWorkletsInspectorMainThread::javaClassStatic(), jni::JNativeRunnable::newObjectCxxArgs(std::move(callback)));
  };
}

WorkletsInspectorWebSocketFactory makeAndroidInspectorWebSocketFactory() {
  return [](const std::string &url, std::weak_ptr<react::jsinspector_modern::IWebSocketDelegate> delegate) {
    jni::ThreadScope threadScope;
    return std::make_unique<AndroidInspectorWebSocket>(url, std::move(delegate));
  };
}

} // namespace worklets
