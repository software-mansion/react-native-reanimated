#pragma once

#include <mutex>
#include <utility>

namespace worklets {

class RNRuntimeStatus {
 public:
  void setDead() {
    std::lock_guard<std::mutex> lock(mutex_);
    isDead_ = true;
  }

  template <typename TFn>
  void runWhileLocked(TFn &&fn) {
    std::lock_guard<std::mutex> lock(mutex_);
    const bool isDead = isDead_;
    std::forward<TFn>(fn)(isDead);
  }

 private:
  bool isDead_ = false;
  std::mutex mutex_;
};

} // namespace worklets
