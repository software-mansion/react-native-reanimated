#pragma once

#include <fbjni/fbjni.h>
#include <jsinspector-modern/WebSocketInterfaces.h>
#include <worklets/Inspector/WorkletsInspectorConnection.h>

#include <memory>
#include <string>
#include <string_view>
#include <utility>

namespace worklets {

/**
 * Native half of the OkHttp-backed inspector WebSocket. Forwards the socket
 * callbacks, which OkHttp invokes on its own threads, to the WebSocket
 * delegate of the Worklets inspector connection.
 */
class JWorkletsInspectorWebSocket : public facebook::jni::HybridClass<JWorkletsInspectorWebSocket> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/worklets/inspector/WorkletsInspectorWebSocket;";

  static void registerNatives();

  void didOpen();
  void didReceiveMessage(facebook::jni::alias_ref<facebook::jni::JString> message);
  void didClose();
  void didFailWithError(facebook::jni::alias_ref<facebook::jni::JString> error);

 private:
  friend HybridBase;

  explicit JWorkletsInspectorWebSocket(std::weak_ptr<facebook::react::jsinspector_modern::IWebSocketDelegate> delegate)
      : delegate_(std::move(delegate)) {}

  std::weak_ptr<facebook::react::jsinspector_modern::IWebSocketDelegate> delegate_;
};

/**
 * IWebSocket implementation that owns the Java WorkletsInspectorWebSocket.
 */
class AndroidInspectorWebSocket final : public facebook::react::jsinspector_modern::IWebSocket {
 public:
  AndroidInspectorWebSocket(
      const std::string &url,
      std::weak_ptr<facebook::react::jsinspector_modern::IWebSocketDelegate> delegate);

  ~AndroidInspectorWebSocket() override;

  void send(std::string_view message) override;

 private:
  facebook::jni::global_ref<JWorkletsInspectorWebSocket::javaobject> javaWebSocket_;
};

WorkletsInspectorWebSocketFactory makeAndroidInspectorWebSocketFactory();

/**
 * Returns an executor that posts callbacks to the main looper.
 */
facebook::react::jsinspector_modern::VoidExecutor makeAndroidMainThreadExecutor();

} // namespace worklets
