#include <worklets/Registries/WorkletRuntimeRegistry.h>

#include <memory>

namespace worklets {

const RuntimeIdentity *findRuntimeIdentity(facebook::jsi::Runtime &rt) {
  if (const auto *provider = facebook::jsi::castInterface<IRuntimeIdentityProvider>(&rt)) [[likely]] {
    return &provider->getRuntimeIdentity();
  }
  return static_cast<const RuntimeIdentity *>(rt.getRuntimeData(runtimeIdentityDataUUID).get());
}

void setRuntimeIdentityData(facebook::jsi::Runtime &rt, const RuntimeIdentity &identity) {
  rt.setRuntimeData(runtimeIdentityDataUUID, std::make_shared<RuntimeIdentity>(identity));
}

} // namespace worklets
