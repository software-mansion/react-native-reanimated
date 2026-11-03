#include <worklets/WorkletRuntime/RuntimeIdentity.h>

#include <memory>

namespace worklets {

namespace {

constexpr facebook::jsi::UUID rnRuntimeIdentityUUID{0x1f6a2d94, 0x3c8b, 0x4e05, 0xb7a1, 0x6d24c9e83f52};

} // namespace

const RuntimeIdentity *findRuntimeIdentity(facebook::jsi::Runtime &rt) {
  if (const auto *provider = facebook::jsi::castInterface<IRuntimeIdentityProvider>(&rt)) [[likely]] {
    return &provider->getRuntimeIdentity();
  }
  return static_cast<const RuntimeIdentity *>(rt.getRuntimeData(rnRuntimeIdentityUUID).get());
}

void setRNRuntimeIdentity(facebook::jsi::Runtime &rnRuntime, const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus) {
  rnRuntime.setRuntimeData(
      rnRuntimeIdentityUUID, std::make_shared<RuntimeIdentity>(RuntimeIdentity::forRNRuntime(rnRuntimeStatus)));
}

} // namespace worklets
