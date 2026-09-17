#pragma once

#include <fbjni/fbjni.h>
#include <worklets/Networking/NetworkingBackend.h>

#include <memory>
#include <optional>
#include <string>

namespace worklets {

namespace jni = facebook::jni;

class JNetworking : public jni::JavaClass<JNetworking> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/worklets/networking/Networking;";
};

class AndroidNetworkingBackend final : public NetworkingBackend {
 public:
  explicit AndroidNetworkingBackend(jni::global_ref<JNetworking::javaobject> networking);

  void sendRequest(uint64_t requestId, RequestConfig &&config, const std::shared_ptr<NetworkRequestListener> &listener)
      override;
  void abortRequest(uint64_t requestId) override;
  std::optional<std::string> decodeText(const uint8_t *data, size_t size, const std::string &label) override;

 private:
  const jni::global_ref<JNetworking::javaobject> networking_;
};

} // namespace worklets
