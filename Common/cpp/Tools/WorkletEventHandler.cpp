#include "WorkletEventHandler.h"

namespace reanimated {

void WorkletEventHandler::process(
    jsi::Runtime &uiRuntime,
    const double eventTimestamp,
    const jsi::Value &eventValue) const {
  runOnRuntimeGuarded(
      uiRuntime, handlerFunction_, jsi::Value(eventTimestamp), eventValue);
}

uint64_t WorkletEventHandler::getHandlerId() const {
  return handlerId_;
}

const std::string &WorkletEventHandler::getEventName() const {
  return eventName_;
}

uint64_t WorkletEventHandler::getEmitterReactTag() const {
  return emitterReactTag_;
}

bool WorkletEventHandler::shouldIgnoreEmitterReactTag() const {
  return emitterReactTag_ == -1;
}

} // namespace reanimated
