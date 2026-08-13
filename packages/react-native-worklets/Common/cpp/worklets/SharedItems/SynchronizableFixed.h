#pragma once

#include <worklets/SharedItems/Synchronizable.h>

#include <atomic>
#include <memory>
#include <variant>

namespace worklets {

class SynchronizableFixed final : public Synchronizable {
 public:
  explicit SynchronizableFixed(double value)
      : Synchronizable(true), value_(std::in_place_type<std::atomic<double>>, value) {}

  explicit SynchronizableFixed(bool value)
      : Synchronizable(true), value_(std::in_place_type<std::atomic<bool>>, value) {}

  static std::shared_ptr<SynchronizableFixed> make(const SynchronizableFixedValue &initialValue);

  SynchronizableValue getDirty() override;

  SynchronizableValue getBlocking() override;

  void setDirty(const SynchronizableFixedValue &value) override;

  void setBlocking(const std::shared_ptr<Serializable> &value) override;

  void setBlocking(const SynchronizableFixedValue &value) override;

 private:
  void store(const SynchronizableFixedValue &value);
  SynchronizableValue load() const;

  std::variant<std::atomic<double>, std::atomic<bool>> value_;
};

static_assert(std::atomic<double>::is_always_lock_free);
static_assert(std::atomic<bool>::is_always_lock_free);

}; // namespace worklets
