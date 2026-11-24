#pragma once

#include <worklets/RunLoop/AsyncQueue.h>

#include <functional>

namespace worklets {

class VSyncAsyncQueue : public AsyncQueue {
 public:
  ~VSyncAsyncQueue() override = default;

  virtual void requestAnimationFrame(std::function<void(double)> &&callback) = 0;
};

} // namespace worklets
