#ifndef RNWORKLETS_ASYNCQUEUE_H
#define RNWORKLETS_ASYNCQUEUE_H

#include <jsi/jsi.h>

namespace worklets {

class AsyncQueue : public facebook::jsi::NativeState {
 public:
  ~AsyncQueue() override = default;

  virtual void push(std::function<void()> &&job) = 0;
};

} // namespace worklets

#endif // RNWORKLETS_ASYNCQUEUE_H
