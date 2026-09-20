#pragma once

#include <jsi/jsi.h>
#include <worklets/Networking/Networking.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>

using namespace facebook;

namespace worklets {

class NetworkingInstaller {
 public:
  static void
  install(jsi::Runtime &rt, const std::shared_ptr<Networking> &networking, RuntimeData::RuntimeId runtimeId);
};

} // namespace worklets
