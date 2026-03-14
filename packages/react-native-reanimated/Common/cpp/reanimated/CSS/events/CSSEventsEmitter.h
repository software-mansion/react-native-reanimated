#pragma once

#include <reanimated/CSS/events/CSSEvent.h>

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>

#include <memory>
#include <vector>

using namespace facebook;

namespace reanimated::css {

class CSSEventsEmitter {
 public:
  explicit CSSEventsEmitter(const std::shared_ptr<react::CallInvoker> &jsInvoker);

  void setEmitFunction(std::shared_ptr<jsi::Function> emitFunction);
  void schedule(CSSEvent event);
  void emit();
  bool hasEvents() const;

 private:
  const std::shared_ptr<react::CallInvoker> jsInvoker_;
  std::shared_ptr<jsi::Function> emitFunction_;
  std::vector<CSSEvent> pendingEvents_;
};

} // namespace reanimated::css
