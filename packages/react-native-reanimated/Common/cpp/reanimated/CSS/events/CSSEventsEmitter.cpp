#include <reanimated/CSS/events/CSSEventsEmitter.h>

#include <utility>
#include <vector>

namespace reanimated::css {

using namespace facebook;

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
  return "";
}

namespace {

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
  masks_.clear();
  pending_.clear();
}

void CSSEventsEmitter::setMask(const react::Tag viewTag, const CSSEventMask mask) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (mask == 0) {
    masks_.erase(viewTag);
  } else {
    masks_[viewTag] = mask;
  }
}

void CSSEventsEmitter::clearTag(const react::Tag viewTag) {
  std::lock_guard<std::mutex> lock(mutex_);
  masks_.erase(viewTag);
}

bool CSSEventsEmitter::hasListener(const react::Tag viewTag, const CSSEventType type) const {
  std::lock_guard<std::mutex> lock(mutex_);
  const auto it = masks_.find(viewTag);
  return it != masks_.end() && css::hasListener(it->second, type);
}

void CSSEventsEmitter::schedule(CSSEvent event) {
  std::lock_guard<std::mutex> lock(mutex_);
  const auto it = masks_.find(event.viewTag);
  if (it == masks_.end() || !css::hasListener(it->second, event.type)) {
    return;
  }
  pending_.push_back(std::move(event));
}

void CSSEventsEmitter::flush() {
  std::vector<CSSEvent> events;
  std::shared_ptr<jsi::Function> emitFunction;

  {
    std::lock_guard<std::mutex> lock(mutex_);
    if (pending_.empty() || !emitFunction_) {
      pending_.clear();
      return;
    }
    events = std::exchange(pending_, {});
    emitFunction = emitFunction_;
  }

  jsInvoker_->invokeAsync([weakThis = weak_from_this(), emitFunction, events = std::move(events)](jsi::Runtime &rt) {
    // The emitter owns the function, so bail out if it went away with the
    // module while this hop was in flight.
    if (weakThis.expired()) {
      return;
    }
    emitFunction->call(rt, eventsToJSIArray(rt, events));
  });
}

} // namespace reanimated::css
