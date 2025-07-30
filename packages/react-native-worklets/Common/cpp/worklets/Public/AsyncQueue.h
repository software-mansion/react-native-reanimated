#pragma once

#include <jsi/jsi.h>

namespace worklets {

class AsyncQueue : public facebook::jsi::NativeState {
 public:
  virtual ~AsyncQueue() = default;

  virtual void push(std::function<void()> &&job) = 0;
  virtual void pushPriority(std::function<void()> &&job) = 0;
  virtual void pushTimeout(std::function<void()> &&job, long long delay) = 0;
};

} // namespace worklets
