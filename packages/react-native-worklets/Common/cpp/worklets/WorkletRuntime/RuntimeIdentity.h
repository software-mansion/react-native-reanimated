#pragma once

#include <jsi/jsi.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <utility>

namespace worklets {

class RuntimeManager;
class RNRuntimeStatus;

class RuntimeIdentity {
 public:
  RuntimeIdentity() = default;

  [[nodiscard]] static RuntimeIdentity forWorkletRuntime(
      const std::weak_ptr<RuntimeManager> &runtimeManager,
      RuntimeData::RuntimeId runtimeId) {
    return RuntimeIdentity{runtimeManager, runtimeId};
  }

  [[nodiscard]] static RuntimeIdentity forRNRuntime(const std::weak_ptr<RNRuntimeStatus> &rnRuntimeStatus) {
    return RuntimeIdentity{rnRuntimeStatus, RuntimeData::rnRuntimeId};
  }

  [[nodiscard]] RuntimeData::RuntimeId getRuntimeId() const noexcept {
    return runtimeId_;
  }

  [[nodiscard]] bool isRNRuntime() const noexcept {
    return runtimeId_ == RuntimeData::rnRuntimeId;
  }

  /**
   * Two identities match when their ids are equal and their owners share the
   * same control block. `owner_before` orders weak pointers by control block,
   * so "neither is before the other" means the same owner. Unlike comparing
   * `lock().get()`, this works on expired owners and never matches two dead
   * owners, and the control block cannot be reused while this weak pointer
   * keeps it allocated.
   */
  [[nodiscard]] bool isSameRuntime(const RuntimeIdentity &other) const noexcept {
    return runtimeId_ == other.runtimeId_ && !owner_.owner_before(other.owner_) && !other.owner_.owner_before(owner_);
  }

  [[nodiscard]] std::shared_ptr<RuntimeManager> lockRuntimeManager() const {
    if (isRNRuntime()) {
      return nullptr;
    }
    return std::static_pointer_cast<RuntimeManager>(owner_.lock());
  }

  [[nodiscard]] std::shared_ptr<RNRuntimeStatus> lockRNRuntimeStatus() const {
    if (!isRNRuntime()) {
      return nullptr;
    }
    return std::static_pointer_cast<RNRuntimeStatus>(owner_.lock());
  }

 private:
  RuntimeIdentity(std::weak_ptr<void> owner, RuntimeData::RuntimeId runtimeId)
      : owner_(std::move(owner)), runtimeId_(runtimeId) {}

  std::weak_ptr<void> owner_;
  RuntimeData::RuntimeId runtimeId_{0};
};

class IRuntimeIdentityProvider : public facebook::jsi::ICast {
 public:
  static constexpr facebook::jsi::UUID uuid{0x5b0d3c1e, 0x7a42, 0x4f6e, 0x9c3d, 0x2e81a4b7f019};

  [[nodiscard]] virtual const RuntimeIdentity &getRuntimeIdentity() const noexcept = 0;

 protected:
  ~IRuntimeIdentityProvider() = default;
};

const RuntimeIdentity *findRuntimeIdentity(facebook::jsi::Runtime &rt);

void setRNRuntimeIdentity(facebook::jsi::Runtime &rnRuntime, const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus);

} // namespace worklets
