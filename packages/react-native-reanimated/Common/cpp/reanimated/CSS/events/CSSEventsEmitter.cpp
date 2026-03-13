#include <reanimated/CSS/events/CSSEventsEmitter.h>

#include <string>
#include <utility>

using namespace facebook;

namespace reanimated::css {

namespace {

bool isAnimationEvent(const std::string &type) {
  return type.rfind("animation", 0) == 0;
}

jsi::Object eventToJSIObject(jsi::Runtime &rt, const CSSEvent &event) {
  auto obj = jsi::Object(rt);
  obj.setProperty(rt, "viewTag", event.viewTag);
  obj.setProperty(rt, "type", jsi::String::createFromUtf8(rt, event.type));
  obj.setProperty(
      rt,
      // TODO - add support for transition events
      isAnimationEvent(event.type) ? "animationName" : "propertyName",
      jsi::String::createFromUtf8(rt, event.targetName));
  obj.setProperty(rt, "elapsedTime", event.elapsedTime);
  return obj;
}

jsi::Array eventsToJSIArray(jsi::Runtime &rt, const std::vector<CSSEvent> &events) {
  auto array = jsi::Array(rt, events.size());
  for (size_t i = 0; i < events.size(); ++i) {
    array.setValueAtIndex(rt, i, eventToJSIObject(rt, events[i]));
  }
  return array;
}

} // namespace

CSSEventsEmitter::CSSEventsEmitter(const std::shared_ptr<react::CallInvoker> &jsInvoker) : jsInvoker_(jsInvoker) {}

void CSSEventsEmitter::setEmitFunction(std::shared_ptr<jsi::Function> emitFunction) {
  emitFunction_ = std::move(emitFunction);
}

void CSSEventsEmitter::schedule(CSSEvent event) {
  pendingEvents_.emplace_back(std::move(event));
}

void CSSEventsEmitter::emit() {
  if (pendingEvents_.empty() || !emitFunction_) {
    return;
  }

  auto events = std::make_shared<std::vector<CSSEvent>>();
  events->swap(pendingEvents_);
  auto emitFunction = emitFunction_;

  jsInvoker_->invokeAsync([events = std::move(events), emitFunction = std::move(emitFunction)](jsi::Runtime &rt) {
    emitFunction->call(rt, eventsToJSIArray(rt, *events));
  });
}

bool CSSEventsEmitter::hasEvents() const {
  return !pendingEvents_.empty();
}

} // namespace reanimated::css
