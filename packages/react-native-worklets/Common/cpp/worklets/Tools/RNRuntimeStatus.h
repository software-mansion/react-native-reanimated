#pragma once

#include <concepts>
#include <mutex>
#include <shared_mutex>
#include <utility>

namespace worklets {

class RNRuntimeStatus {
 public:
  void setDead() {
    std::lock_guard<std::shared_mutex> lock(mutex_);
    isDead_ = true;
  }

  template <std::invocable<bool> TFn>
  void runWhileLocked(TFn &&fn) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    const bool isDead = isDead_;
    std::forward<TFn>(fn)(isDead);
  }

 private:
  bool isDead_ = false;
  std::shared_mutex mutex_;
};

} // namespace worklets
