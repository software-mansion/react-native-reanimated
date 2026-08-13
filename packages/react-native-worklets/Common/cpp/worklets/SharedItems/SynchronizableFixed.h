#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Synchronizable.h>

#include <atomic>
#include <memory>
#include <variant>

namespace worklets {

class SynchronizableFixed final : public Synchronizable {
 public:
  explicit SynchronizableFixed(double value);

  explicit SynchronizableFixed(bool value);

  static std::shared_ptr<SynchronizableFixed> make(const jsi::Value &initialValue);

  bool isFixed() const override;

  jsi::Value getDirty(jsi::Runtime &rt) override;

  jsi::Value getBlocking(jsi::Runtime &rt) override;

  void setDirty(jsi::Runtime &rt, const jsi::Value &value) override;

  void setBlocking(jsi::Runtime &rt, const jsi::Value &value) override;

 private:
  void storeChecked(const jsi::Value &value);
  jsi::Value load() const;

  std::variant<std::atomic<double>, std::atomic<bool>> value_;
};

static_assert(std::atomic<double>::is_always_lock_free);
static_assert(std::atomic<bool>::is_always_lock_free);

}; // namespace worklets
