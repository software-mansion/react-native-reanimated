#pragma once

#include <reanimated/CSS/events/CSSEvent.h>

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>

#include <memory>
#include <mutex>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

/// Collects CSS animation and transition events produced while the frame is
/// being processed and delivers them to JS as a single batch.
///
/// Events are produced on the UI thread while registry locks are held, so
/// `schedule` only buffers. `flush` moves the buffer out under the emitter's
/// own mutex and hands it to the JS thread, which is why it never calls into
/// JS while a caller still holds a registry lock.
class CSSEventsEmitter : public std::enable_shared_from_this<CSSEventsEmitter> {
 public:
  explicit CSSEventsEmitter(const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker);

  void setEmitFunction(std::shared_ptr<facebook::jsi::Function> emitFunction);
  void invalidate();

  /// A mask of 0 removes the view, so views without callbacks cost nothing
  /// beyond a single lookup and never accumulate entries.
  void setMask(facebook::react::Tag viewTag, CSSEventMask mask);
  void clearTag(facebook::react::Tag viewTag);
  bool hasListener(facebook::react::Tag viewTag, CSSEventType type) const;

  /// Buffers the event, dropping it unless the view subscribed to its type.
  void schedule(CSSEvent event);
  void flush();

 private:
  const std::shared_ptr<facebook::react::CallInvoker> jsInvoker_;

  mutable std::mutex mutex_;
  std::shared_ptr<facebook::jsi::Function> emitFunction_;
  std::unordered_map<facebook::react::Tag, CSSEventMask> masks_;
  std::vector<CSSEvent> pending_;
};

} // namespace reanimated::css
