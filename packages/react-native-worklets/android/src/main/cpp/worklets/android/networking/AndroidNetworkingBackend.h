#pragma once

#include <fbjni/fbjni.h>
#include <worklets/Networking/NetworkingBackend.h>

#include <memory>

namespace worklets {

using namespace facebook;

class JWorkletsNetworking : public jni::JavaClass<JWorkletsNetworking> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/worklets/networking/WorkletsNetworking;";
};

class AndroidNetworkingBackend final : public NetworkingBackend {
 public:
  explicit AndroidNetworkingBackend(jni::global_ref<JWorkletsNetworking::javaobject> workletsNetworking);

  void sendRequest(uint64_t requestId, RequestConfig &&config, const std::shared_ptr<NetworkRequestListener> &listener)
      override;
  void abortRequest(uint64_t requestId) override;

 private:
  const jni::global_ref<JWorkletsNetworking::javaobject> workletsNetworking_;
};

} // namespace worklets
