#include <reanimated/CSS/events/CSSEventsEmitter.h>

#include <utility>
#include <vector>

namespace reanimated::css {

using namespace facebook;

namespace {

/// Wire name of the event, matching the string union on the JS side.
const char *cssEventTypeName(const CSSEventType type) {
  switch (type) {
    case CSSEventType::AnimationStart:
      return "animationStart";
    case CSSEventType::AnimationEnd:
      return "animationEnd";
    case CSSEventType::AnimationIteration:
      return "animationIteration";
    case CSSEventType::AnimationCancel:
      return "animationCancel";
    case CSSEventType::TransitionRun:
      return "transitionRun";
    case CSSEventType::TransitionStart:
      return "transitionStart";
    case CSSEventType::TransitionEnd:
      return "transitionEnd";
    case CSSEventType::TransitionCancel:
      return "transitionCancel";
  }
}

jsi::Array eventsToJSIArray(jsi::Runtime &rt, const std::vector<CSSEvent> &events) {
  jsi::Array result(rt, events.size());

  for (size_t i = 0; i < events.size(); i++) {
    const auto &event = events[i];
    jsi::Object jsEvent(rt);
    jsEvent.setProperty(rt, "tag", jsi::Value(static_cast<int>(event.viewTag)));
    jsEvent.setProperty(rt, "type", jsi::String::createFromUtf8(rt, cssEventTypeName(event.type)));
    jsEvent.setProperty(rt, "name", jsi::String::createFromUtf8(rt, event.name));
    jsEvent.setProperty(rt, "elapsedTime", jsi::Value(event.elapsedTime));
    result.setValueAtIndex(rt, i, std::move(jsEvent));
  }

  return result;
}

} // namespace

CSSEventsEmitter::CSSEventsEmitter(const std::shared_ptr<react::CallInvoker> &jsInvoker) : jsInvoker_(jsInvoker) {}

void CSSEventsEmitter::setEmitFunction(std::shared_ptr<jsi::Function> emitFunction) {
  std::lock_guard<std::mutex> lock(mutex_);
  emitFunction_ = std::move(emitFunction);
}

void CSSEventsEmitter::invalidate() {
  std::lock_guard<std::mutex> lock(mutex_);
  emitFunction_.reset();
  pending_.clear();
  drainRequested_ = false;
}

void CSSEventsEmitter::emit(CSSEvent event) {
  bool shouldScheduleDrain;

  {
    std::lock_guard<std::mutex> lock(mutex_);
    // Buffering before the handler is installed, or after it is gone, would
    // grow `pending_` for events that can never be delivered.
    if (!emitFunction_) {
      return;
    }
    pending_.push_back(std::move(event));
    shouldScheduleDrain = !drainRequested_ || pending_.size() % kDrainRetryBacklog == 0;
    drainRequested_ = true;
  }

  // Scheduled after unlocking: `emit` already holds the updates registry lock,
  // and reaching into the scheduler under both is how lock cycles start.
  if (shouldScheduleDrain) {
    scheduleDrain();
  }
}

void CSSEventsEmitter::scheduleDrain() {
  jsInvoker_->invokeAsync([weakThis = weak_from_this()](jsi::Runtime &rt) {
    if (const auto strongThis = weakThis.lock()) {
      strongThis->drain(rt);
    }
  });
}

void CSSEventsEmitter::drain(jsi::Runtime &rt) {
  std::vector<CSSEvent> events;
  std::shared_ptr<jsi::Function> emitFunction;

  {
    std::lock_guard<std::mutex> lock(mutex_);
    drainRequested_ = false;
    events.swap(pending_);
    emitFunction = emitFunction_;
  }

  if (events.empty() || !emitFunction) {
    return;
  }

  // Called unlocked so a callback that synchronously emits again cannot deadlock.
  emitFunction->call(rt, eventsToJSIArray(rt, events));
}

} // namespace reanimated::css
