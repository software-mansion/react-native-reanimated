#pragma once

#include <ReactCommon/CallInvoker.h>
#include <memory>

namespace reanimated {

class JSScheduler {
 public:
  explicit JSScheduler(
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker)
      : jsCallInvoker_(jsCallInvoker) {}
  void scheduleOnJS(std::function<void()> &&job);

 protected:
  const std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker_;
};

} // namespace reanimated
