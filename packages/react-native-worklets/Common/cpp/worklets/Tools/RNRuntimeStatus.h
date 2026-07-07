#pragma once

#include <atomic>

namespace worklets {

class RNRuntimeStatus {
 public:
  [[nodiscard]] bool isDead() const {
    return isDead_;
  }

  void setDead() {
    isDead_ = true;
  }

 private:
  std::atomic_bool isDead_ = false;
};

} // namespace worklets
