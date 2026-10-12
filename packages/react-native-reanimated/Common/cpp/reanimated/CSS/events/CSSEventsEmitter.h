#pragma once

#include <reanimated/CSS/events/CSSEvent.h>

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>

#include <memory>
#include <mutex>
#include <vector>

namespace reanimated::css {

/// Batches CSS animation and transition events and delivers them to JS.
///
/// Whether a view listens for an event is decided by its owner before emitting,
/// so this only batches. `emit` runs on both the UI and the JS thread with the
/// updates registry lock held, so it buffers and asks the JS thread for a
/// drain, and the JS function is only ever called from that drain.
class CSSEventsEmitter : public std::enable_shared_from_this<CSSEventsEmitter> {
 public:
  explicit CSSEventsEmitter(const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker);

  void setEmitFunction(std::shared_ptr<facebook::jsi::Function> emitFunction);
  void invalidate();

  void emit(CSSEvent event);

 private:
  const std::shared_ptr<facebook::react::CallInvoker> jsInvoker_;

  std::mutex mutex_;
  std::shared_ptr<facebook::jsi::Function> emitFunction_;
  std::vector<CSSEvent> pending_;

  void scheduleDrain();
  void drain(facebook::jsi::Runtime &rt);
};

} // namespace reanimated::css
